"""Converte o ZIP fornecido em GLB com esqueleto e USDZ com animação amostrada."""
from pathlib import Path
import argparse, json, math, struct, zipfile, tempfile, xml.etree.ElementTree as ET
import numpy as np
from scipy.spatial.transform import Rotation
from pxr import Usd, UsdGeom, UsdShade, UsdUtils, Sdf, Gf, Vt
ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(); parser.add_argument('zip',type=Path); args=parser.parse_args()
archive=zipfile.ZipFile(args.zip)
r=ET.fromstring(archive.read('Mew/Mew.dae')); ns={'c':r.tag.split('}')[0][1:]}
def floats(e): return np.array(list(map(float,e.text.split())))
def source(id,shape): return floats(r.find(f'.//c:source[@id="{id}"]/c:float_array',ns)).reshape(shape)
pos=source('GeometrySource',(-1,3)); normals=source('GeometrySource1',(-1,3)); uv=source('GeometrySource2',(-1,2)); uv[:,1]=1-uv[:,1]
tri=np.array(list(map(int,r.find('.//c:triangles/c:p',ns).text.split())),dtype=np.uint16)
# Recalcula normais compartilhadas nas costuras UV para eliminar manchas facetadas.
face_normals=np.cross(pos[tri.reshape(-1,3)[:,1]]-pos[tri.reshape(-1,3)[:,0]],pos[tri.reshape(-1,3)[:,2]]-pos[tri.reshape(-1,3)[:,0]])
_,merged=np.unique(np.round(pos,5),axis=0,return_inverse=True)
smoothed=np.zeros((merged.max()+1,3))
for corner in range(3):np.add.at(smoothed,merged[tri.reshape(-1,3)[:,corner]],face_normals)
normals=smoothed[merged];normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-10)
bind=source('Controller-bind_poses',(-1,4,4)); joint_names=r.find('.//c:Name_array',ns).text.split()
weights_source=source('Controller-weights',(-1,))
vcounts=list(map(int,r.find('.//c:vertex_weights/c:vcount',ns).text.split())); raw=list(map(int,r.find('.//c:vertex_weights/c:v',ns).text.split()))
joints=np.zeros((len(pos),4),dtype=np.uint16); weights=np.zeros((len(pos),4)); cursor=0
for i,count in enumerate(vcounts):
 pairs=[(raw[cursor+j*2],weights_source[raw[cursor+j*2+1]]) for j in range(count)];cursor+=count*2
 pairs=sorted(pairs,key=lambda v:-v[1])[:4]
 for k,(j,w) in enumerate(pairs):joints[i,k]=j;weights[i,k]=w
 weights[i]/=weights[i].sum()
# Os arquivos DAE usam matrizes em linhas; glTF armazena as matrizes por colunas.
nodes=[]; names={}; parents={}; rest=[]
def add_node(e,parent=None):
 idx=len(nodes);names[e.get('sid',e.get('name'))]=idx
 matrix=floats(e.find('c:matrix',ns)).reshape(4,4)
 rot=Rotation.from_matrix(matrix[:3,:3]).as_quat()
 node={'name':e.get('name'),'translation':matrix[:3,3].tolist(),'rotation':rot.tolist()}
 nodes.append(node);rest.append(matrix)
 if parent is not None: nodes[parent].setdefault('children',[]).append(idx);parents[idx]=parent
 for child in e.findall('c:node',ns):add_node(child,idx)
add_node(r.find('.//c:visual_scene/c:node',ns))
rest=np.array(rest)
joint_indices=[names[n] for n in joint_names]
# Raiz normaliza altura do corpo (sem cauda) para aproximadamente 38 cm.
scale=.038
root_translation=np.array([0,-pos[:,1].min()*scale,0])
def pose(t):
 local=rest.copy(); phase=2*math.pi*t/6
 for name,axis,angle in [('BustN','x',.018*math.sin(phase)),('NeckN','z',.045*math.sin(phase)),('HeadN','y',.055*math.sin(phase)),('LShoulderJ','z',.035*math.sin(phase)),('RShoulderJ','z',-.035*math.sin(phase))]:
  idx=names[name];local[idx,:3,:3]=rest[idx,:3,:3]@Rotation.from_euler(axis,angle).as_matrix()
 for k,name in enumerate(['o_a','o_b','o_c','o_d','o_e','o_f','o_g','o_h','o_i','o_j']):
  idx=names[name];angle= .22 + .045*math.sin(phase-k*.32)
  local[idx,:3,:3]=rest[idx,:3,:3]@Rotation.from_euler('z',angle).as_matrix()
 world=[]
 for i,m in enumerate(local):world.append(world[parents[i]]@m if i in parents else m)
 palette=np.array([world[j]@ib for j,ib in zip(joint_indices,bind)])
 blend=np.einsum('vk,vkij->vij',weights,palette[joints])
 points=np.einsum('vij,vj->vi',blend,np.column_stack([pos,np.ones(len(pos))]))[:,:3]
 n=np.einsum('vij,vj->vi',blend[:,:3,:3],normals);n/=np.linalg.norm(n,axis=1)[:,None]
 return local,points,n
binary=bytearray();views=[];accessors=[]
def view(payload,target=None):
 while len(binary)%4:binary.append(0)
 i=len(views);views.append({'buffer':0,'byteOffset':len(binary),'byteLength':len(payload)})
 if target:views[-1]['target']=target
 binary.extend(payload);return i
def acc(a,kind,component=5126,target=None,bounds=False):
 a=np.asarray(a,dtype='<f4' if component==5126 else '<u2');v=view(a.tobytes(),target)
 d={'bufferView':v,'componentType':component,'count':len(a),'type':kind}
 if bounds:d.update(min=a.min(axis=0).reshape(-1).tolist(),max=a.max(axis=0).reshape(-1).tolist())
 accessors.append(d);return len(accessors)-1
attrs={'POSITION':acc(pos,'VEC3',target=34962,bounds=True),'NORMAL':acc(normals,'VEC3',target=34962),'TEXCOORD_0':acc(uv,'VEC2',target=34962),'JOINTS_0':acc(joints,'VEC4',5123,34962),'WEIGHTS_0':acc(weights,'VEC4',target=34962)}
indices=acc(tri,'SCALAR',5123,34963)
ib=acc(np.array([m.T.reshape(-1) for m in bind]),'MAT4')
image=archive.read('Mew/model.nut0.png'); image_view=view(image)
mesh_idx=len(nodes);nodes.append({'name':'Mew texturizado','mesh':0,'skin':0})
root=len(nodes);nodes.append({'name':'Mew - escala local','translation':root_translation.tolist(),'scale':[scale]*3,'children':[0,mesh_idx]})
times=np.linspace(0,6,61);time_acc=acc(times,'SCALAR',bounds=True);samplers=[];channels=[]
animated=['BustN','NeckN','HeadN','LShoulderJ','RShoulderJ']+['o_'+c for c in 'abcdefghij']
poses=[pose(t) for t in times]
for i,m in enumerate(poses[0][0]):
 nodes[i]['rotation']=Rotation.from_matrix(m[:3,:3]).as_quat().tolist()
for name in animated:
 idx=names[name];q=np.array([Rotation.from_matrix(p[0][idx,:3,:3]).as_quat() for p in poses])
 for k in range(1,len(q)):
  if np.dot(q[k-1],q[k])<0:q[k]*=-1
 samplers.append({'input':time_acc,'output':acc(q,'VEC4'),'interpolation':'LINEAR'});channels.append({'sampler':len(samplers)-1,'target':{'node':idx,'path':'rotation'}})
gltf={'asset':{'version':'2.0','generator':'Conversão local do ZIP fornecido; Idle criado no projeto'},'scene':0,'scenes':[{'nodes':[root]}],'nodes':nodes,'skins':[{'joints':joint_indices,'inverseBindMatrices':ib,'skeleton':0}],'meshes':[{'primitives':[{'attributes':attrs,'indices':indices,'material':0}]}],'materials':[{'name':'Mew - textura original','pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.72},'doubleSided':True}],'images':[{'bufferView':image_view,'mimeType':'image/png'}],'textures':[{'source':0,'sampler':0}],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'animations':[{'name':'Idle','samplers':samplers,'channels':channels}],'accessors':accessors,'bufferViews':views,'buffers':[{'byteLength':len(binary)}]}
json_bytes=json.dumps(gltf,separators=(',',':')).encode();json_bytes+=b' '*((-len(json_bytes))%4);binary+=b'\0'*((-len(binary))%4)
output=ROOT/'models/mew.glb';output.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(json_bytes)+len(binary))+struct.pack('<I4s',len(json_bytes),b'JSON')+json_bytes+struct.pack('<I4s',len(binary),b'BIN\0')+binary)
# Quick Look: animação deformada amostrada, preservando UV e textura sem depender de skinning USD.
with tempfile.TemporaryDirectory(prefix='mew-export-') as tmp:
 tmp=Path(tmp);(tmp/'mew.png').write_bytes(image);stage=Usd.Stage.CreateNew(str(tmp/'Mew.usdc'))
 stage.SetStartTimeCode(0);stage.SetEndTimeCode(180);stage.SetTimeCodesPerSecond(30)
 UsdGeom.SetStageUpAxis(stage,UsdGeom.Tokens.y);UsdGeom.SetStageMetersPerUnit(stage,1)
 root_prim=UsdGeom.Xform.Define(stage,'/Mew');stage.SetDefaultPrim(root_prim.GetPrim())
 mesh=UsdGeom.Mesh.Define(stage,'/Mew/Geometry');mesh.CreateSubdivisionSchemeAttr(UsdGeom.Tokens.none)
 mesh.CreateFaceVertexCountsAttr([3]*(len(tri)//3));mesh.CreateFaceVertexIndicesAttr(tri.tolist());mesh.CreateDoubleSidedAttr(True)
 points_attr=mesh.CreatePointsAttr();normal_attr=mesh.CreateNormalsAttr();mesh.SetNormalsInterpolation(UsdGeom.Tokens.vertex)
 for t,(_,points,n) in zip(times,poses):
  points=points*scale+root_translation
  points_attr.Set(Vt.Vec3fArray.FromNumpy(points.astype(np.float32)),float(t*30));normal_attr.Set(Vt.Vec3fArray.FromNumpy(n.astype(np.float32)),float(t*30))
 points_attr.Set(Vt.Vec3fArray.FromNumpy((poses[0][1]*scale+root_translation).astype(np.float32)))
 st=UsdGeom.PrimvarsAPI(mesh).CreatePrimvar('st',Sdf.ValueTypeNames.TexCoord2fArray,UsdGeom.Tokens.vertex)
 usd_uv=uv.copy();usd_uv[:,1]=1-usd_uv[:,1];st.Set(Vt.Vec2fArray.FromNumpy(usd_uv.astype(np.float32)))
 material=UsdShade.Material.Define(stage,'/Mew/Looks/Pink');shader=UsdShade.Shader.Define(stage,'/Mew/Looks/Pink/Surface');shader.CreateIdAttr('UsdPreviewSurface');shader.CreateInput('roughness',Sdf.ValueTypeNames.Float).Set(.72);shader.CreateInput('metallic',Sdf.ValueTypeNames.Float).Set(0)
 reader=UsdShade.Shader.Define(stage,'/Mew/Looks/Pink/UV');reader.CreateIdAttr('UsdPrimvarReader_float2');reader.CreateInput('varname',Sdf.ValueTypeNames.Token).Set('st');reader.CreateOutput('result',Sdf.ValueTypeNames.Float2)
 tex=UsdShade.Shader.Define(stage,'/Mew/Looks/Pink/Texture');tex.CreateIdAttr('UsdUVTexture');tex.CreateInput('file',Sdf.ValueTypeNames.Asset).Set(Sdf.AssetPath('mew.png'));tex.CreateInput('sourceColorSpace',Sdf.ValueTypeNames.Token).Set('sRGB');tex.CreateInput('st',Sdf.ValueTypeNames.Float2).ConnectToSource(reader.ConnectableAPI(),'result');tex.CreateOutput('rgb',Sdf.ValueTypeNames.Float3)
 shader.CreateInput('diffuseColor',Sdf.ValueTypeNames.Color3f).ConnectToSource(tex.ConnectableAPI(),'rgb');shader.CreateOutput('surface',Sdf.ValueTypeNames.Token);material.CreateSurfaceOutput().ConnectToSource(shader.ConnectableAPI(),'surface');UsdShade.MaterialBindingAPI.Apply(mesh.GetPrim()).Bind(material)
 stage.GetRootLayer().Save();target=ROOT/'models/mew.usdz'
 if target.exists():target.unlink()
 assert UsdUtils.CreateNewUsdzPackage(Sdf.AssetPath(str(tmp/'Mew.usdc')),str(target))
 # Windows mantém a camada aberta: não solicitar exclusão enquanto há referências USD.
 stage=None
 import gc;gc.collect()
print(f'GLB: {output.stat().st_size} bytes; USDZ: {target.stat().st_size} bytes; {len(pos)} vertices; {len(tri)//3} triangulos; 15 canais Idle')
