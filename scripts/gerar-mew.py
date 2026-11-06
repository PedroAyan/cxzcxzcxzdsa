"""Gera um modelo GLB estilizado do Mew a partir da referência fornecida."""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "models" / "mew.glb"
LATITUDE_SEGMENTS = 20
LONGITUDE_SEGMENTS = 28


def align(data: bytearray, boundary: int = 4) -> None:
    while len(data) % boundary:
        data.append(0)


binary = bytearray()
buffer_views: list[dict] = []
accessors: list[dict] = []


def append_view(payload: bytes, target: int | None) -> int:
    align(binary)
    offset = len(binary)
    binary.extend(payload)
    buffer_view = {
        "buffer": 0,
        "byteOffset": offset,
        "byteLength": len(payload),
    }
    if target is not None:
        buffer_view["target"] = target
    buffer_views.append(buffer_view)
    return len(buffer_views) - 1


def add_vec3_accessor(values: list[float], minimum: list[float] | None = None, maximum: list[float] | None = None) -> int:
    view = append_view(struct.pack(f"<{len(values)}f", *values), 34962)
    accessor = {
        "bufferView": view,
        "componentType": 5126,
        "count": len(values) // 3,
        "type": "VEC3",
    }
    if minimum is not None:
        accessor["min"] = minimum
    if maximum is not None:
        accessor["max"] = maximum
    accessors.append(accessor)
    return len(accessors) - 1


def add_index_accessor(values: list[int]) -> int:
    view = append_view(struct.pack(f"<{len(values)}H", *values), 34963)
    accessors.append({
        "bufferView": view,
        "componentType": 5123,
        "count": len(values),
        "type": "SCALAR",
        "min": [min(values)],
        "max": [max(values)],
    })
    return len(accessors) - 1


def add_animation_accessor(
    values: list[float],
    accessor_type: str,
    minimum: list[float] | None = None,
    maximum: list[float] | None = None,
) -> int:
    component_count = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[accessor_type]
    view = append_view(struct.pack(f"<{len(values)}f", *values), None)
    accessor = {
        "bufferView": view,
        "componentType": 5126,
        "count": len(values) // component_count,
        "type": accessor_type,
    }
    if minimum is not None:
        accessor["min"] = minimum
    if maximum is not None:
        accessor["max"] = maximum
    accessors.append(accessor)
    return len(accessors) - 1


def sphere_geometry() -> tuple[int, int, int]:
    positions: list[float] = []
    normals: list[float] = []
    for row in range(LATITUDE_SEGMENTS + 1):
        theta = math.pi * row / LATITUDE_SEGMENTS
        for column in range(LONGITUDE_SEGMENTS + 1):
            phi = 2 * math.pi * column / LONGITUDE_SEGMENTS
            point = (
                math.sin(theta) * math.cos(phi),
                math.cos(theta),
                math.sin(theta) * math.sin(phi),
            )
            positions.extend(point)
            normals.extend(point)

    indices: list[int] = []
    ring = LONGITUDE_SEGMENTS + 1
    for row in range(LATITUDE_SEGMENTS):
        for column in range(LONGITUDE_SEGMENTS):
            top_left = row * ring + column
            top_right = top_left + 1
            bottom_left = top_left + ring
            bottom_right = bottom_left + 1
            if row > 0:
                indices.extend((top_left, top_right, bottom_left))
            if row < LATITUDE_SEGMENTS - 1:
                indices.extend((top_right, bottom_right, bottom_left))

    return (
        add_vec3_accessor(positions, [-1, -1, -1], [1, 1, 1]),
        add_vec3_accessor(normals),
        add_index_accessor(indices),
    )


def cone_geometry(segments: int = 24) -> tuple[int, int, int]:
    positions: list[float] = []
    normals: list[float] = []
    for index in range(segments):
        angle = 2 * math.pi * index / segments
        x, z = math.cos(angle), math.sin(angle)
        normal_length = math.sqrt(2)
        positions.extend((x, -0.5, z))
        normals.extend((x / normal_length, 1 / normal_length, z / normal_length))
    for index in range(segments):
        angle = 2 * math.pi * (index + 0.5) / segments
        x, z = math.cos(angle), math.sin(angle)
        normal_length = math.sqrt(2)
        positions.extend((0, 0.5, 0))
        normals.extend((x / normal_length, 1 / normal_length, z / normal_length))

    indices: list[int] = []
    for index in range(segments):
        next_index = (index + 1) % segments
        indices.extend((index, segments + index, next_index))

    return (
        add_vec3_accessor(positions, [-1, -0.5, -1], [1, 0.5, 1]),
        add_vec3_accessor(normals),
        add_index_accessor(indices),
    )


meshes: list[dict] = []
sphere_attributes = sphere_geometry()
materials = [
    ("Rosa suave", [0.91, 0.57, 0.66, 1]),
    ("Rosa claro", [1.0, 0.75, 0.80, 1]),
    ("Rosa das orelhas", [0.79, 0.34, 0.47, 1]),
    ("Olhos azul-turquesa", [0.15, 0.70, 0.84, 1]),
    ("Pupilas", [0.055, 0.12, 0.17, 1]),
    ("Brilhos", [1.0, 0.97, 0.91, 1]),
]

gltf_materials = [
    {
        "name": name,
        "pbrMetallicRoughness": {
            "baseColorFactor": color,
            "metallicFactor": 0,
            "roughnessFactor": 0.67,
        },
    }
    for name, color in materials
]

for material_index, (name, _) in enumerate(materials):
    meshes.append({
        "name": f"Forma {name.lower()}",
        "primitives": [{
            "attributes": {"POSITION": sphere_attributes[0], "NORMAL": sphere_attributes[1]},
            "indices": sphere_attributes[2],
            "material": material_index,
            "mode": 4,
        }],
    })

cone_attributes = cone_geometry()
pink_cone_mesh = len(meshes)
meshes.append({
    "name": "Orelha pontuda",
    "primitives": [{
        "attributes": {"POSITION": cone_attributes[0], "NORMAL": cone_attributes[1]},
        "indices": cone_attributes[2],
        "material": 0,
        "mode": 4,
    }],
})

nodes: list[dict] = []
node_indices: dict[str, int] = {}
parented_node_indices: set[int] = set()


def add_sphere(
    name: str,
    material: int,
    translation: tuple[float, float, float],
    scale: tuple[float, float, float],
    rotation_z_degrees: float = 0,
) -> None:
    node: dict = {
        "name": name,
        "mesh": material,
        "translation": list(translation),
        "scale": list(scale),
    }
    if rotation_z_degrees:
        half_angle = math.radians(rotation_z_degrees) / 2
        node["rotation"] = [0, 0, math.sin(half_angle), math.cos(half_angle)]
    node_indices[name] = len(nodes)
    nodes.append(node)


def add_cone(name: str, translation: tuple[float, float, float], scale: tuple[float, float, float], rotation_z_degrees: float) -> None:
    half_angle = math.radians(rotation_z_degrees) / 2
    node_indices[name] = len(nodes)
    nodes.append({
        "name": name,
        "mesh": pink_cone_mesh,
        "translation": list(translation),
        "scale": list(scale),
        "rotation": [0, 0, math.sin(half_angle), math.cos(half_angle)],
    })


def group_nodes(name: str, child_indices: list[int], pivot: tuple[float, float, float]) -> int:
    for child_index in child_indices:
        child = nodes[child_index]
        translation = child.get("translation", [0, 0, 0])
        child["translation"] = [translation[axis] - pivot[axis] for axis in range(3)]
    group_index = len(nodes)
    nodes.append({
        "name": name,
        "translation": list(pivot),
        "children": child_indices,
    })
    parented_node_indices.update(child_indices)
    return group_index


def catmull_rom(points: list[tuple[float, float, float]], steps: int = 8) -> list[tuple[float, float, float]]:
    sampled: list[tuple[float, float, float]] = []
    for segment in range(len(points) - 1):
        p0 = points[max(0, segment - 1)]
        p1 = points[segment]
        p2 = points[segment + 1]
        p3 = points[min(len(points) - 1, segment + 2)]
        for step in range(steps):
            t = step / steps
            t2, t3 = t * t, t * t * t
            point = []
            for axis in range(3):
                value = 0.5 * (
                    2 * p1[axis]
                    + (-p0[axis] + p2[axis]) * t
                    + (2 * p0[axis] - 5 * p1[axis] + 4 * p2[axis] - p3[axis]) * t2
                    + (-p0[axis] + 3 * p1[axis] - 3 * p2[axis] + p3[axis]) * t3
                )
                point.append(value)
            sampled.append(tuple(point))
    sampled.append(points[-1])
    return sampled


def unit_quaternion_from_y(direction: tuple[float, float, float]) -> list[float]:
    length = math.sqrt(sum(component * component for component in direction))
    dx, dy, dz = (component / length for component in direction)
    if dy < -0.99999:
        return [1, 0, 0, 0]
    # Rotação do eixo Y local até a tangente da cauda.
    qx, qy, qz, qw = dz, 0, -dx, 1 + dy
    norm = math.sqrt(qx * qx + qy * qy + qz * qz + qw * qw)
    return [qx / norm, qy / norm, qz / norm, qw / norm]


def add_tail() -> list[int]:
    curve = catmull_rom([
        (0.02, 0.23, -0.09),
        (-0.20, 0.16, -0.10),
        (-0.41, 0.20, -0.10),
        (-0.45, 0.42, -0.08),
        (-0.42, 0.62, -0.06),
        (-0.28, 0.73, -0.04),
        (-0.18, 0.72, -0.02),
    ])
    tail_indices: list[int] = []
    for index, point in enumerate(curve):
        before = curve[max(0, index - 1)]
        after = curve[min(len(curve) - 1, index + 1)]
        tangent = tuple(after[axis] - before[axis] for axis in range(3))
        amount = index / (len(curve) - 1)
        radius = 0.030 * (1 - amount) ** 0.82 + 0.006
        step_length = math.sqrt(sum((after[axis] - point[axis]) ** 2 for axis in range(3)))
        name = f"Cauda curva {index + 1:02d}"
        node_indices[name] = len(nodes)
        tail_indices.append(len(nodes))
        nodes.append({
            "name": name,
            "mesh": 0,
            "translation": list(point),
            "scale": [radius, max(step_length * 0.9, radius * 0.75), radius],
            "rotation": unit_quaternion_from_y(tangent),
        })
    return tail_indices


# Cauda longa e curva atrás do corpo.
tail_group_index = group_nodes("Cauda", add_tail(), (0.02, 0.23, -0.09))

# Corpo compacto sentado, com pernas e pés à frente.
add_sphere("Quadril", 0, (0, 0.20, -0.005), (0.15, 0.15, 0.125))
add_sphere("Tronco", 0, (0, 0.34, 0.005), (0.14, 0.20, 0.112))
add_sphere("Peito", 1, (0, 0.38, 0.088), (0.092, 0.13, 0.042))
add_sphere("Pescoço", 1, (0, 0.47, 0.012), (0.09, 0.09, 0.088))
add_sphere("Cabeça", 0, (0, 0.56, 0.014), (0.17, 0.15, 0.14))

# Orelhas triangulares e interiores rosados.
add_cone("Orelha esquerda", (-0.12, 0.68, 0.008), (0.065, 0.17, 0.045), 22)
add_cone("Orelha direita", (0.12, 0.68, 0.008), (0.065, 0.17, 0.045), -22)
add_sphere("Interior da orelha esquerda", 2, (-0.135, 0.685, 0.040), (0.025, 0.082, 0.012), 22)
add_sphere("Interior da orelha direita", 2, (0.135, 0.685, 0.040), (0.025, 0.082, 0.012), -22)

# Olhos grandes azul-turquesa, pupilas escuras e brilhos.
eye_group_indices: dict[str, int] = {}
for side, x in (("esquerdo", -0.073), ("direito", 0.073)):
    add_sphere(f"Olho {side}", 5, (x, 0.572, 0.139), (0.047, 0.058, 0.027))
    add_sphere(f"Íris {side}", 3, (x, 0.570, 0.160), (0.029, 0.041, 0.018))
    add_sphere(f"Pupila {side}", 4, (x, 0.569, 0.175), (0.014, 0.029, 0.012))
    add_sphere(f"Brilho {side}", 5, (x - 0.008, 0.589, 0.185), (0.009, 0.012, 0.006))
    eye_children = [node_indices[f"{part} {side}"] for part in ("Olho", "Íris", "Pupila", "Brilho")]
    eye_group_indices[side] = group_nodes(
        f"Olho {side} - piscar",
        eye_children,
        (x, 0.572, 0.139),
    )

add_sphere("Nariz", 2, (0, 0.505, 0.148), (0.018, 0.013, 0.011))
add_sphere("Bochecha esquerda", 1, (-0.12, 0.495, 0.113), (0.029, 0.018, 0.014))
add_sphere("Bochecha direita", 1, (0.12, 0.495, 0.113), (0.029, 0.018, 0.014))
add_sphere("Sorriso", 4, (0, 0.478, 0.150), (0.026, 0.008, 0.006))

# Braços curtos apoiados no colo.
add_sphere("Braço esquerdo", 0, (-0.115, 0.355, 0.105), (0.048, 0.125, 0.048), -13)
add_sphere("Braço direito", 0, (0.115, 0.355, 0.105), (0.048, 0.125, 0.048), 13)
add_sphere("Mão esquerda", 1, (-0.075, 0.255, 0.145), (0.052, 0.043, 0.045))
add_sphere("Mão direita", 1, (0.075, 0.255, 0.145), (0.052, 0.043, 0.045))

# Pernas dobradas e pés virados para a frente.
add_sphere("Coxa esquerda", 0, (-0.105, 0.18, 0.045), (0.085, 0.095, 0.10), -16)
add_sphere("Coxa direita", 0, (0.105, 0.18, 0.045), (0.085, 0.095, 0.10), 16)
add_sphere("Pé esquerdo", 1, (-0.145, 0.095, 0.12), (0.115, 0.062, 0.14), -9)
add_sphere("Pé direito", 1, (0.145, 0.095, 0.12), (0.115, 0.062, 0.14), 9)

# Junta rosto e olhos para que a cabeça possa acompanhar a animação sem separar as feições.
head_group_index = group_nodes(
    "Cabeça",
    [
        node_indices[name]
        for name in (
            "Cabeça",
            "Orelha esquerda",
            "Orelha direita",
            "Interior da orelha esquerda",
            "Interior da orelha direita",
            "Nariz",
            "Bochecha esquerda",
            "Bochecha direita",
            "Sorriso",
        )
    ] + list(eye_group_indices.values()),
    (0, 0.56, 0.014),
)


def quaternion_for_axis(axis: str, angle: float) -> list[float]:
    half_angle = angle / 2
    sine = math.sin(half_angle)
    if axis == "x":
        return [sine, 0, 0, math.cos(half_angle)]
    if axis == "y":
        return [0, sine, 0, math.cos(half_angle)]
    return [0, 0, sine, math.cos(half_angle)]


def multiply_quaternions(first: list[float], second: list[float]) -> list[float]:
    ax, ay, az, aw = first
    bx, by, bz, bw = second
    return [
        aw * bx + ax * bw + ay * bz - az * by,
        aw * by - ax * bz + ay * bw + az * bx,
        aw * bz + ax * by - ay * bx + az * bw,
        aw * bw - ax * bx - ay * by - az * bz,
    ]


animation_samplers: list[dict] = []
animation_channels: list[dict] = []


def add_animation_track(
    times_accessor: int,
    values: list[float],
    accessor_type: str,
    node_index: int,
    path: str,
    interpolation: str = "LINEAR",
) -> None:
    output_accessor = add_animation_accessor(values, accessor_type)
    sampler_index = len(animation_samplers)
    animation_samplers.append({
        "input": times_accessor,
        "output": output_accessor,
        "interpolation": interpolation,
    })
    animation_channels.append({
        "sampler": sampler_index,
        "target": {"node": node_index, "path": path},
    })


idle_times = [0, 1.5, 3, 4.5, 6]
idle_times_accessor = add_animation_accessor(idle_times, "SCALAR", [0], [6])
tail_angles = [0, 0.12, 0, -0.12, 0]
tail_rotations = [value for angle in tail_angles for value in quaternion_for_axis("z", angle)]
add_animation_track(idle_times_accessor, tail_rotations, "VEC4", tail_group_index, "rotation")

head_rotations: list[float] = []
for nod_angle, tilt_angle in zip((0, 0.035, 0, -0.035, 0), (0, 0.02, 0, -0.02, 0)):
    head_rotations.extend(multiply_quaternions(
        quaternion_for_axis("z", tilt_angle),
        quaternion_for_axis("x", nod_angle),
    ))
add_animation_track(idle_times_accessor, head_rotations, "VEC4", head_group_index, "rotation")

body_heights = [0.34, 0.344, 0.34, 0.336, 0.34]
body_translations = [component for height in body_heights for component in (0, height, 0.005)]
add_animation_track(idle_times_accessor, body_translations, "VEC3", node_indices["Tronco"], "translation")

blink_times = [0, 1.8, 1.9, 2.05, 2.15, 4.8, 4.9, 5.05, 5.15, 6]
blink_times_accessor = add_animation_accessor(blink_times, "SCALAR", [0], [6])
eye_scales = [
    1, 1, 1,
    1, 1, 1,
    1, 0.08, 1,
    1, 0.08, 1,
    1, 1, 1,
    1, 1, 1,
    1, 0.08, 1,
    1, 0.08, 1,
    1, 1, 1,
    1, 1, 1,
]
for eye_group_index in eye_group_indices.values():
    add_animation_track(blink_times_accessor, eye_scales, "VEC3", eye_group_index, "scale")

# A raiz mantém os nós de animação e as partes independentes na mesma cena.
root_children = [index for index in range(len(nodes)) if index not in parented_node_indices]

# Raiz dimensiona o personagem para uma experiência de mesa.
root_node_index = len(nodes)
nodes.append({
    "name": "Mew em escala de mesa",
    "children": root_children,
    "scale": [0.46, 0.46, 0.46],
})

gltf = {
    "asset": {"version": "2.0", "generator": "Modelo estilizado criado a partir da referência fornecida"},
    "scene": 0,
    "scenes": [{"name": "Mew", "nodes": [root_node_index]}],
    "nodes": nodes,
    "meshes": meshes,
    "materials": gltf_materials,
    "accessors": accessors,
    "bufferViews": buffer_views,
    "buffers": [{"byteLength": len(binary)}],
    "animations": [{
        "name": "Idle",
        "samplers": animation_samplers,
        "channels": animation_channels,
    }],
}

json_chunk = json.dumps(gltf, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
while len(json_chunk) % 4:
    json_chunk += b" "
while len(binary) % 4:
    binary.append(0)

total_length = 12 + 8 + len(json_chunk) + 8 + len(binary)
with OUTPUT.open("wb") as output:
    output.write(struct.pack("<4sII", b"glTF", 2, total_length))
    output.write(struct.pack("<I4s", len(json_chunk), b"JSON"))
    output.write(json_chunk)
    output.write(struct.pack("<I4s", len(binary), b"BIN\x00"))
    output.write(binary)

print(f"Modelo criado: {OUTPUT} ({OUTPUT.stat().st_size:,} bytes; {len(nodes) - 1} partes)")
