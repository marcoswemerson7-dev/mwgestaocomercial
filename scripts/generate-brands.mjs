import {readFile,mkdir,writeFile} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root=path.resolve("public","brands");
await mkdir(root,{recursive:true});
for (const stem of ["supermercado-vitoria","acai-vitoria"]){
 const svg=await readFile(path.join(root,stem+".svg"),"utf8");
 const match=svg.match(/data:image\/webp;base64,([A-Za-z0-9+/=]+)/);
 if(!match)throw new Error("Imagem de marca incorporada não encontrada: "+stem);
 const original=Buffer.from(match[1],"base64");
 // Transparent RGBA upscaled using Lanczos, sharpened for device pixel ratios.
 const png=await sharp(original).resize({width:900,fit:"inside",withoutEnlargement:false,kernel:"lanczos3"}).sharpen({sigma:.6}).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();
 await writeFile(path.join(root,stem+".png"),png);
 console.log("PNG gerado:",stem+".png",png.length,"bytes");
}
