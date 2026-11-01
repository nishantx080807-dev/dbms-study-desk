// Mechanical projection: keep original lesson text out of the initial home bundle.
const fs=require('node:fs');
const course=JSON.parse(fs.readFileSync('src/data/course.json','utf8'));
const catalog={...course,chapters:course.chapters.map(({sourceText,...chapter})=>chapter)};
fs.writeFileSync('src/data/catalog.json',JSON.stringify(catalog,null,2)+'\n');
