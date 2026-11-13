import {createHash} from 'node:crypto';
import {XMLParser,XMLValidator} from 'fast-xml-parser';
export type Normalized={id:string;source:'fitbit'|'apple-health'|'oura';sourceRecord:string;metric:'steps';value:number;unit:'count';period:{date:string;start:string|null;end:string|null;precision:'day'|'interval'}};
function day(value:unknown):string{
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)throw new Error('Invalid calendar day');return value;
}
function count(value:unknown):number{
 if((typeof value!=='string'&&typeof value!=='number')||(typeof value==='string'&&!/^\d+$/.test(value)))throw new Error('Invalid step count');
 const n=Number(value);if(!Number.isSafeInteger(n)||n<0)throw new Error('Invalid step count');return n;
}
function appleTime(value:unknown):string{
 if(typeof value!=='string')throw new Error('Missing Apple timestamp');
 const m=/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/.exec(value);
 if(!m)throw new Error('Apple timestamps require an explicit offset');day(m[1]);
 const [h,min,sec]=m[2].split(':').map(Number);
 if(h>23||min>59||sec>59||Number(m[4])>14||Number(m[5])>59||(m[4]==='14'&&m[5]!=='00'))throw new Error('Invalid timestamp');
 const iso=`${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}`;return new Date(iso).toISOString();
}
export function normalize(fitbit:unknown,appleXml:string,oura:unknown):Normalized[]{
 const out:Normalized[]=[];
 const add=(source:Normalized['source'],sourceRecord:string,value:unknown,date:string,start:string|null=null,end:string|null=null)=>{
  const identity=JSON.stringify({source,sourceRecord,date,start,end});
  out.push({id:createHash('sha256').update(identity).digest('hex'),source,sourceRecord,metric:'steps',value:count(value),unit:'count',period:{date:day(date),start,end,precision:start?'interval':'day'}});
 };
 const f=fitbit as {'activities-steps'?:{dateTime:unknown;value:unknown}[]};
 if(!Array.isArray(f?.['activities-steps']))throw new Error('Expected Fitbit activities-steps array');
 for(const row of f['activities-steps']){const date=day(row.dateTime);add('fitbit',`day:${date}`,row.value,date);}
 if(Buffer.byteLength(appleXml)>1_000_000)throw new Error('Apple XML sample exceeds 1MB');
 if(/<!DOCTYPE|<!ENTITY/i.test(appleXml)||XMLValidator.validate(appleXml)!==true)throw new Error('Invalid or unsafe XML');
 const parser=new XMLParser({ignoreAttributes:false,processEntities:false,isArray:name=>name==='Record'});
 const apple=parser.parse(appleXml);
 if(!apple?.HealthData||typeof apple.HealthData!=='object')throw new Error('Expected Apple HealthData');
 for(const record of apple.HealthData.Record??[]){
  if(record['@_type']!=='HKQuantityTypeIdentifierStepCount')continue;
  if(record['@_unit']!=='count')throw new Error('Unsupported Apple step unit');
  const start=appleTime(record['@_startDate']),end=appleTime(record['@_endDate']);
  if(Date.parse(end)<Date.parse(start))throw new Error('Inverted Apple interval');
  const source=record['@_sourceName'];if(typeof source!=='string'||!source.trim())throw new Error('Missing Apple source');
  // The local date remains separate from UTC instants; daily data is not assigned an invented timezone.
  add('apple-health',source,record['@_value'],record['@_startDate'].slice(0,10),start,end);
 }
 const o=oura as {data?:{id:unknown;day:unknown;steps:unknown}[]};
 if(!Array.isArray(o?.data))throw new Error('Expected Oura daily_activity data array');
 for(const row of o.data){if(typeof row.id!=='string'||!row.id)throw new Error('Missing Oura record ID');add('oura',row.id,row.steps,day(row.day));}
 const unique=new Map<string,Normalized>();
 for(const row of out){const previous=unique.get(row.id);if(previous&&previous.value!==row.value)throw new Error('Conflicting values for the same source record');unique.set(row.id,row);}
 return [...unique.values()].sort((a,b)=>a.source.localeCompare(b.source)||a.period.date.localeCompare(b.period.date)||a.id.localeCompare(b.id));
}
