"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState, Skeleton, StatCard } from "@/components/khushaan/ui";
import styles from "@/components/khushaan/console.module.css";
import { listAuditEntries, listCategories, listTeams, listUsers } from "@/lib/khushaan/api";
import type { AuditEntry, Category, Team, User } from "@/lib/khushaan/types";

export default function AdminDashboardPage(){const [users,setUsers]=useState<User[]>([]),[teams,setTeams]=useState<Team[]>([]),[categories,setCategories]=useState<Category[]>([]),[audits,setAudits]=useState<AuditEntry[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState<string|null>(null);
 const load=async()=>{setLoading(true);setError(null);try{const[u,t,c,a]=await Promise.all([listUsers(),listTeams(),listCategories(),listAuditEntries()]);setUsers(u);setTeams(t);setCategories(c);setAudits(a.slice(0,8));}catch(e){setError(e instanceof Error?e.message:"Unable to load admin dashboard.");}finally{setLoading(false);}};useEffect(()=>{void load();},[]);
 const actorName=(id:string)=>users.find(u=>u.user_id===id)?.name||id;
 const links=[{label:"Users",href:"/admin-khus/users"},{label:"Teams",href:"/admin-khus/teams"},{label:"Categories",href:"/admin-khus/categories"},{label:"SLA policies",href:"/admin-khus/sla-policies"},{label:"Business hours",href:"/admin-khus/business-hours"},{label:"Notifications",href:"/admin-khus/notifications"},{label:"Settings",href:"/admin-khus/settings"},{label:"Audit log",href:"/admin-khus/audit-log"}];
 return <div className={styles.adminPage}><div><p className={styles.pageEyebrow}>Administration overview</p><h1 className={styles.pageTitle}>Admin dashboard</h1></div>{loading?<Skeleton label="Loading admin dashboard" rows={8}/>:error?<section className={styles.emptyState}><h2>Something went wrong</h2><p>{error}</p><button className={styles.buttonPrimary} onClick={()=>void load()} type="button">Try again</button></section>:<><section className={styles.reportMetricGrid} aria-label="Admin counts"><StatCard label="Users" value={users.length} /><StatCard label="Teams" value={teams.filter(t=>t.is_active).length} /><StatCard label="Categories" value={categories.filter(c=>c.is_active).length} /></section><section className={styles.adminDashboardGrid}><article className={styles.adminPanel}><h2>Latest audit entries</h2>{audits.length?<div className={styles.auditPreview}>{audits.map(a=><div key={a.audit_id}><strong>{a.action}</strong><span>{actorName(a.actor_id)} · {new Date(a.created_at).toLocaleString()}</span></div>)}</div>:<EmptyState title="No audit entries"/>}</article><article className={styles.adminPanel}><h2>Shortcuts</h2><div className={styles.adminShortcuts}>{links.map(link=><Link key={link.href} href={link.href}>{link.label}</Link>)}</div></article></section></>}</div>;
}
