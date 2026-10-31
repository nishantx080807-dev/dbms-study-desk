import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import data from '../src/data/course.json';
import {initialProgress,validateProgress,chapterStats,recordAnswer} from '../src/lib/progress';
test('curriculum is byte-for-byte equivalent as parsed data, with 254 task IDs and 26 questions',()=>{
 const original=JSON.parse(fs.readFileSync('migration/original.html','utf8').match(/<script id="course-data" type="application\/json">([\s\S]*?)<\/script>/)![1]);
 assert.deepEqual(data,original);assert.equal(data.chapters.flatMap(c=>c.tasks).length,254);assert.equal(data.chapters.flatMap(c=>c.quiz).length,26);
});
test('version-1 backup validates old fields and first attempts survive retries',()=>{
 const p=initialProgress();p.tasks['c1-t1']=true;p.notes['1']='<script>plain note</script>';p.counts.sql=500;
 const restored=validateProgress(JSON.parse(JSON.stringify(p)));assert.equal(chapterStats(restored,1).done,1);assert.equal(restored.counts.sql,50);
 let q=recordAnswer(restored,1,0,1);q=recordAnswer(q,1,0,0);assert.equal(q.quizzes['1-0'].first,1);assert.equal(q.quizzes['1-0'].choice,0);assert.equal(q.notes['1'],p.notes['1']);
});
test('invalid backups reject without mutating original and unknown IDs are ignored',()=>{
 const original=initialProgress();assert.throws(()=>validateProgress({version:1,tasks:{'c1-t1':'yes'}}));assert.throws(()=>validateProgress({version:2,tasks:{}}));assert.throws(()=>validateProgress({version:1,tasks:{},quizzes:{'1-0':{first:99,choice:0}}}));assert.equal(chapterStats(original,1).done,0);assert.deepEqual(validateProgress({version:1,tasks:{evil:true}}).tasks,{});
});
