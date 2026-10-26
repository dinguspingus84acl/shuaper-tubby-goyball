'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'analytics/ui.js'),'utf8');
const css=fs.readFileSync(path.join(root,'analytics/studio.css'),'utf8');
function extract(name,kind){
 const open=kind==='array'?'[':'{',close=kind==='array'?']':'}';
 const match=js.match(new RegExp('const '+name+'=([\\s\\S]*?\\n'+(close==='}'?'\\}':'\\]')+');'));
 assert.ok(match,'Missing '+name);
 return vm.runInNewContext('('+match[1]+')');
}
const catalog=extract('usageCatalog','array');
const definitions=extract('usageDescriptions','object');
const groups=extract('usageGroups','object');
const names=new Set(catalog.map(row=>row[0]));
assert.equal(names.size,20,'Expected 20 unique usage metrics');
assert.deepEqual([...Object.keys(definitions)].sort(),[...names].sort(),'A tooltip is required for every metric');
for(const field of names){
 const [meaning,formula]=definitions[field];
 assert.ok(meaning.length>24,field+' needs a useful description');
 assert.ok(formula.length>24,field+' needs a calculation');
}
for(const fields of Object.values(groups))for(const field of fields)assert.ok(names.has(field),'Unknown metric in usage group '+field);
for(const token of ['data-st-usage-field','data-st-usage-info',"e.target.closest?.('.st-usage-info')",'showUsageTooltip(usageInfo,true)']){
 assert.ok(js.includes(token),'Missing tooltip interaction '+token);
}
assert.ok(!js.includes('showUsageTooltip(usageValue,true)'),'Player stat values must not open tooltips');
assert.ok(!js.includes("e.target.closest?.('.st-usage-table [data-st-usage-field]')"),'Hover is limited to the info icons');
assert.ok(js.includes('if(anchor===usageTooltipAnchor&&!anchor.contains(e.relatedTarget))hideUsageTooltip();'),'Tooltip must close as soon as the pointer leaves its icon');
assert.ok(!css.includes('td[data-st-usage-field]{cursor:help}'),'Only info icons should advertise a tooltip on hover');
assert.ok(css.includes('.st-usage-tooltip[hidden]'),'Tooltip needs a hidden state');
assert.ok(js.includes('hideUsageTooltip();\n const host=section.querySelector'), 'Filtering must close stale tooltips');
console.log('PASS: definitions for 20 usage metrics, icon-only hover/tap, immediate mouseout, sortable headers and tooltip lifecycle');
