import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{normalize}from'../src/normalize.ts';
const f=JSON.parse(await readFile(new URL('../sample-data/fitbit.json',import.meta.url),'utf8'));
const a=await readFile(new URL('../sample-data/apple-health.xml',import.meta.url),'utf8');
const o=JSON.parse(await readFile(new URL('../sample-data/oura.json',import.meta.url),'utf8'));
test('normalizes three sources without conflating daily and interval counts',()=>{
 const rows=normalize(f,a,o);assert.equal(rows.length,3);assert.equal(rows.find(r=>r.source==='fitbit')?.period.start,null);assert.equal(rows.find(r=>r.source==='apple-health')?.period.start,'2026-01-01T10:00:00.000Z');assert.ok(rows.every(r=>r.unit==='count'));
});
test('identical duplicates deduplicate; conflicts reject',()=>{
 const copy=structuredClone(f);copy['activities-steps'].push(copy['activities-steps'][0]);assert.equal(normalize(copy,a,o).length,3);
 copy['activities-steps'][1]={dateTime:'2026-01-01',value:'999'};assert.throws(()=>normalize(copy,a,o),/Conflicting/);
});
test('rejects negatives, NaN and blank steps',()=>{
 for(const value of ['','-1','NaN',1.5])assert.throws(()=>normalize({'activities-steps':[{dateTime:'2026-01-01',value}]},a,o),/step/);
});
test('rejects invalid days, offsets and inverted intervals',()=>{
 assert.throws(()=>normalize(f,a.replaceAll('2026-01-01','2026-02-30'),o),/calendar/);
 assert.throws(()=>normalize(f,a.replaceAll('+0000','+2500'),o),/timestamp/);
 assert.throws(()=>normalize(f,a.replace('11:00:00','09:00:00'),o),/Inverted/);
});
test('rejects XML entity declarations and malformed XML',()=>{
 assert.throws(()=>normalize(f,'<!DOCTYPE HealthData [<!ENTITY x "bad">]>'+a,o),/unsafe/);
 assert.throws(()=>normalize(f,'<HealthData><Record></HealthData>',o),/XML/);
});
test('rejects unknown units',()=>{assert.throws(()=>normalize(f,a.replace('unit="count"','unit="meters"'),o),/unit/);});
test('stable identity makes repeated import idempotent',()=>{assert.deepEqual(normalize(f,a,o),normalize(f,a,o));});
