const fs=require('node:fs');
const source=fs.readFileSync('index.html','utf8');
const data=JSON.parse(source.match(/<script id="course-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
fs.mkdirSync('migration',{recursive:true});fs.mkdirSync('src/data',{recursive:true});
fs.copyFileSync('index.html','migration/original.html');
fs.writeFileSync('src/data/course.json',JSON.stringify(data,null,2)+'\n');
console.log(data.chapters.map(c=>({id:c.id,title:c.title,keys:Object.keys(c)})));
