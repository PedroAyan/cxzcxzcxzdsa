"""Gera o USDZ animado do modelo GLB para o AR Quick Look."""

from __future__ import annotations

import json
import gc
import re
import struct
import tempfile
from pathlib import Path

from pxr import Gf, Sdf, Usd, UsdGeom, UsdShade, UsdUtils, Vt


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "models" / "mew.glb"
OUTPUT = ROOT / "models" / "mew.usdz"
TIME_CODES_PER_SECOND = 30.0


def read_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    magic, version, declared_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(data):
        raise ValueError(f"Arquivo GLB inválido: {path}")

    cursor = 12
    document = None
    binary = b""
    while cursor < len(data):
        chunk_length, chunk_type = struct.unpack_from("<I4s", data, cursor)
        cursor += 8
        chunk = data[cursor:cursor + chunk_length]
        cursor += chunk_length
        if chunk_type == b"JSON":
            document = json.loads(chunk.decode("utf-8"))
        elif chunk_type == b"BIN\x00":
            binary = chunk

    if document is None or not binary:
        raise ValueError("O GLB precisa ter blocos JSON e BIN.")
    return document, binary


def make_accessor_reader(document: dict, binary: bytes):
    component_formats = {5121: "B", 5123: "H", 5125: "I", 5126: "f"}
    component_counts = {"SCALAR": 1, "VEC3": 3, "VEC4": 4, "MAT4": 16}

    def read(accessor_index: int) -> list[list[float]]:
        accessor = document["accessors"][accessor_index]
        view = document["bufferViews"][accessor["bufferView"]]
        component_format = component_formats[accessor["componentType"]]
        component_size = struct.calcsize(component_format)
        component_count = component_counts[accessor["type"]]
        item_size = component_size * component_count
        stride = view.get("byteStride", item_size)
        start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        values = []
        for item in range(accessor["count"]):
            offset = start + item * stride
            values.append(list(struct.unpack_from(f"<{component_count}{component_format}", binary, offset)))
        return values

    return read


def identifier(value: str, index: int) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", value).strip("_")
    if not cleaned or cleaned[0].isdigit():
        cleaned = f"Node_{cleaned}"
    return f"{cleaned}_{index}"


def create_preview_materials(stage: Usd.Stage, document: dict) -> list[UsdShade.Material]:
    materials = []
    looks_path = Sdf.Path("/Mew/Looks")
    UsdGeom.Scope.Define(stage, looks_path)

    for index, source_material in enumerate(document.get("materials", [])):
        name = identifier(source_material.get("name", f"Material_{index}"), index)
        material_path = looks_path.AppendChild(name)
        material = UsdShade.Material.Define(stage, material_path)
        shader = UsdShade.Shader.Define(stage, material_path.AppendChild("PreviewSurface"))
        shader.CreateIdAttr("UsdPreviewSurface")

        pbr = source_material.get("pbrMetallicRoughness", {})
        color = pbr.get("baseColorFactor", [0.8, 0.8, 0.8, 1])[:3]
        shader.CreateInput("diffuseColor", Sdf.ValueTypeNames.Color3f).Set(Gf.Vec3f(*color))
        shader.CreateInput("metallic", Sdf.ValueTypeNames.Float).Set(float(pbr.get("metallicFactor", 0)))
        shader.CreateInput("roughness", Sdf.ValueTypeNames.Float).Set(float(pbr.get("roughnessFactor", 0.6)))
        shader.CreateOutput("surface", Sdf.ValueTypeNames.Token)
        material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(), "surface")
        materials.append(material)

    return materials


def add_mesh_primitive(
    stage: Usd.Stage,
    path: Sdf.Path,
    primitive: dict,
    read_accessor,
    materials: list[UsdShade.Material],
) -> None:
    mesh = UsdGeom.Mesh.Define(stage, path)
    attributes = primitive["attributes"]
    points = read_accessor(attributes["POSITION"])
    indices = [int(value[0]) for value in read_accessor(primitive["indices"])]

    mesh.CreatePointsAttr(Vt.Vec3fArray([Gf.Vec3f(*point) for point in points]))
    mesh.CreateFaceVertexCountsAttr(Vt.IntArray([3] * (len(indices) // 3)))
    mesh.CreateFaceVertexIndicesAttr(Vt.IntArray(indices))
    mesh.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)

    if "NORMAL" in attributes:
        normals = read_accessor(attributes["NORMAL"])
        mesh.CreateNormalsAttr(Vt.Vec3fArray([Gf.Vec3f(*normal) for normal in normals]))
        mesh.SetNormalsInterpolation(UsdGeom.Tokens.vertex)

    material_index = primitive.get("material")
    if material_index is not None and material_index < len(materials):
        UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(materials[material_index])


def main() -> None:
    if not SOURCE.is_file():
        raise FileNotFoundError(f"GLB não encontrado: {SOURCE}")

    document, binary = read_glb(SOURCE)
    read_accessor = make_accessor_reader(document, binary)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="mew-usdz-") as temporary_directory:
        # USDZ exige entradas sem compressão; USDC mantém a geometria compacta
        # sem transformar cada ponto do modelo em texto USDA.
        source_usdc = Path(temporary_directory) / "Mew.usdc"
        stage = Usd.Stage.CreateNew(str(source_usdc))
        if not stage:
            raise RuntimeError("Não foi possível criar o arquivo USD temporário.")

        UsdGeom.SetStageUpAxis(stage, UsdGeom.Tokens.y)
        UsdGeom.SetStageMetersPerUnit(stage, 1.0)
        stage.SetTimeCodesPerSecond(TIME_CODES_PER_SECOND)

        root_path = Sdf.Path("/Mew")
        root = UsdGeom.Xform.Define(stage, root_path)
        stage.SetDefaultPrim(root.GetPrim())
        materials = create_preview_materials(stage, document)
        node_paths: dict[int, Sdf.Path] = {}
        node_ops: dict[int, dict[str, UsdGeom.XformOp]] = {}

        def create_node(node_index: int, parent_path: Sdf.Path) -> None:
            source_node = document["nodes"][node_index]
            node_name = identifier(source_node.get("name", f"Node_{node_index}"), node_index)
            node_path = parent_path.AppendChild(node_name)
            transform = UsdGeom.Xform.Define(stage, node_path)
            translation = transform.AddTranslateOp()
            translation.Set(Gf.Vec3d(*source_node.get("translation", [0, 0, 0])))
            rotation = transform.AddOrientOp()
            quaternion = source_node.get("rotation", [0, 0, 0, 1])
            rotation.Set(Gf.Quatf(float(quaternion[3]), Gf.Vec3f(*quaternion[:3])))
            scale = transform.AddScaleOp()
            scale.Set(Gf.Vec3f(*source_node.get("scale", [1, 1, 1])))

            node_paths[node_index] = node_path
            node_ops[node_index] = {
                "translation": translation,
                "rotation": rotation,
                "scale": scale,
            }

            mesh_index = source_node.get("mesh")
            if mesh_index is not None:
                source_mesh = document["meshes"][mesh_index]
                for primitive_index, primitive in enumerate(source_mesh["primitives"]):
                    mesh_path = node_path.AppendChild(f"Geometry_{primitive_index}")
                    add_mesh_primitive(stage, mesh_path, primitive, read_accessor, materials)

            for child_index in source_node.get("children", []):
                create_node(child_index, node_path)

        for scene_node_index in document["scenes"][document.get("scene", 0)]["nodes"]:
            create_node(scene_node_index, root_path)

        animations = document.get("animations", [])
        animation = animations[0] if animations else None
        end_time = 0.0
        if animation:
            for sampler in animation["samplers"]:
                input_values = read_accessor(sampler["input"])
                end_time = max(end_time, max(float(value[0]) for value in input_values))

            stage.SetStartTimeCode(0)
            stage.SetEndTimeCode(end_time * TIME_CODES_PER_SECOND)
            for channel in animation["channels"]:
                sampler = animation["samplers"][channel["sampler"]]
                times = [float(value[0]) for value in read_accessor(sampler["input"])]
                values = read_accessor(sampler["output"])
                node_index = channel["target"]["node"]
                path = channel["target"]["path"]
                op = node_ops[node_index][path]

                for seconds, value in zip(times, values):
                    time_code = Usd.TimeCode(seconds * TIME_CODES_PER_SECOND)
                    if path == "rotation":
                        op.Set(Gf.Quatf(float(value[3]), Gf.Vec3f(*value[:3])), time_code)
                    elif path == "translation":
                        op.Set(Gf.Vec3d(*value), time_code)
                    elif path == "scale":
                        op.Set(Gf.Vec3f(*value), time_code)

        stage.GetRootLayer().Save()
        if OUTPUT.exists():
            OUTPUT.unlink()
        created = UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(source_usdc)), str(OUTPUT))
        if not created:
            raise RuntimeError("OpenUSD não conseguiu empacotar o USDZ.")

        # OpenUSD mantém as camadas USDC abertas enquanto há prims e operações
        # Python referenciando o estágio. Libere tudo antes da limpeza temporária
        # para que a geração também funcione no Windows.
        del create_node, root, materials, node_paths, node_ops
        stage = None
        gc.collect()

    print(f"USDZ criado: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes; animação de {end_time:.1f} s)")


if __name__ == "__main__":
    main()
