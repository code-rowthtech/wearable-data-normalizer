import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {normalize} from './normalize.ts';
try{
 const [fitbit,apple,oura]=await Promise.all(['fitbit.json','apple-health.xml','oura.json'].map(file=>readFile(new URL('../sample-data/'+file,import.meta.url),'utf8')));
 const output=normalize(JSON.parse(fitbit),apple,JSON.parse(oura));await mkdir('output',{recursive:true});await writeFile('output/normalized.json',JSON.stringify(output,null,2)+'\n');
 console.log(JSON.stringify({records:output.length,sources:[...new Set(output.map(r=>r.source))],output:'output/normalized.json',combinedStepTotal:null},null,2));
}catch(error){console.error(error instanceof Error?error.message:'Normalization failed');process.exitCode=1;}
