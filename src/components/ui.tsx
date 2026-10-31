import * as DialogPrimitive from '@radix-ui/react-dialog';
import {cva,type VariantProps} from 'class-variance-authority';
import {X} from 'lucide-react';
import type {ButtonHTMLAttributes,HTMLAttributes,ReactNode} from 'react';
import {cn} from '../lib/utils';
const buttonVariants=cva('button',{variants:{variant:{default:'',primary:'primary',ghost:'ghost',danger:'danger'}},defaultVariants:{variant:'default'}});
export function Button({className,variant,...props}:ButtonHTMLAttributes<HTMLButtonElement>&VariantProps<typeof buttonVariants>){return <button className={cn(buttonVariants({variant}),className)} {...props}/>;}
export function Panel({className,...props}:HTMLAttributes<HTMLElement>){return <section className={cn('panel',className)} {...props}/>;}
export function Badge({children,className}: {children:ReactNode;className?:string}){return <span className={cn('badge',className)}>{children}</span>;}
export function Ring({value,size=36,label}:{value:number;size?:number;label?:string}){const r=15,length=2*Math.PI*r;return <svg className="ring" width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={label??`${value}% complete`}><circle className="ring-track" cx="20" cy="20" r={r}/><circle className="ring-value" cx="20" cy="20" r={r} strokeDasharray={`${length*value/100} ${length}`} transform="rotate(-90 20 20)"/>{size>=70&&<text x="20" y="23" textAnchor="middle">{value}%</text>}</svg>;}
export function Dialog({open,onOpenChange,title,description,children}:{open:boolean;onOpenChange:(v:boolean)=>void;title:string;description:string;children:ReactNode}){return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}><DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay"/><DialogPrimitive.Content className="dialog-content"><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Description>{description}</DialogPrimitive.Description>{children}<DialogPrimitive.Close className="icon-button dialog-close" aria-label="Close dialog"><X size={18}/></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal></DialogPrimitive.Root>;}
