export interface Task {id:string;kind:string;text:string}
export interface Quiz {prompt:string;options:string[];correct:number;explanation:string}
export interface Chapter {id:number;title:string;pages:number[];intro:string;learn:string[][];example:string;recall:string[];tasks:Task[];quiz:Quiz[];practice:string;sourceText:string;weeks?:{number:number;title:string;groups:{title:string;ids:string[]}[]}[]}
