import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root=path.resolve("public","brands");
await mkdir(root,{recursive:true});
for(const stem of ["supermercado-vitoria","acai-vitoria"]){
 const svg=await readFile(path.join(root,stem+".svg"),"utf8");
 const match=svg.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
 if(!match)throw new Error("Marca original não encontrada: "+stem);
 const source=Buffer.from(match[1],"base64");
 const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height,channels}=info;
 if(channels!==4)throw new Error("Formato inesperado no logo "+stem);
 const pixel=(x,y)=>(y*width+x)*4;
 const corners=[[0,0],[width-1,0],[0,height-1],[width-1,height-1]];
 const pixels=corners.map(([x,y])=>pixel(x,y));
 const base=[0,1,2].map(k=>Math.round(pixels.reduce((v,p)=>v+data[p+k],0)/4));
 const cornerAlpha=pixels.reduce((v,p)=>v+data[p+3],0)/4;
 if(cornerAlpha>245){
   // Retira apenas o fundo CONTÍGUO às bordas, sem apagar letras ou ilustrações internas.
   const seen=new Uint8Array(width*height);
   const queue=[];
   for(let x=0;x<width;x++){queue.push([x,0],[x,height-1])}
   for(let y=0;y<height;y++){queue.push([0,y],[width-1,y])}
   let head=0;
   while(head<queue.length){
      const [x,y]=queue[head++];
      if(x<0||y<0||x>=width||y>=height)continue;
      const i=y*width+x;
      if(seen[i])continue;
      seen[i]=1;
      const p=i*4;
      const dist=Math.hypot(data[p]-base[0],data[p+1]-base[1],data[p+2]-base[2]);
      if(dist>48)continue;
      data[p+3]=0;
      queue.push([x-1,y],[x+1,y],[x,y-1],[x,y+1]);
   }
 }
 const png=await sharp(data,{raw:{width,height,channels:4}})
   .resize({width:900,kernel:"lanczos3"})
   .sharpen({sigma:0.65})
   .png({compressionLevel:9,adaptiveFiltering:true})
   .toBuffer();
 await writeFile(path.join(root,stem+".png"),png);
 console.log("PNG preparado:",stem+".png",png.length,"bytes");
}
