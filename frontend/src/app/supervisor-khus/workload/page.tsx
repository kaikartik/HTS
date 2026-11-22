"use client";

import { useEffect, useMemo, useState } from "react";
import { ConfirmDialog, EmptyState, Skeleton, Toast } from "@/components/khushaan/ui";
import styles from "@/components/khushaan/console.module.css";
import { assignTicket, listTickets, listTeams, listUsers } from "@/lib/khushaan/api";
import { mockSlaPolicies } from "@/lib/khushaan/mock-data";
import { getSlaMetrics } from "@/lib/khushaan/sla";
import type { Ticket, User } from "@/lib/khushaan/types";

interface AgentRow { user: User; open: number; critical: number; high: number; medium: number; low: number; atRisk: number; breached: number; }

export default function WorkloadPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Array<{ team_id: string; team_name: string }>>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  const [ticketForAgent, setTicketForAgent] = useState<Ticket | null>(null); const [agentId, setAgentId] = useState("");
  const [confirm, setConfirm] = useState(false); const [toast, setToast] = useState<string | null>(null);

  const load = async () => { setLoading(true); setError(null); try { const [page,userRows,teamRows]=await Promise.all([listTickets({page_size:60}),listUsers(),listTeams()]); setTickets(page.items); setUsers(userRows); setTeams(teamRows); } catch(caught){setError(caught instanceof Error?caught.message:"Unable to load workload.");} finally{setLoading(false);} };
  useEffect(()=>{void load();},[]);

  const rows = useMemo<AgentRow[]>(()=>{
    const openStatuses=new Set(["New","Open","In Progress","On Hold","Reopened"]);
    const agents=users.filter((user)=>user.role==="Agent"&&user.is_active);
    return agents.map((agent)=>{
      const assigned=tickets.filter((ticket)=>openStatuses.has(ticket.status)&&ticket.assignee_id===agent.user_id&&!ticket.merged_into);
      let atRisk=0; let breached=0;
      assigned.forEach((ticket)=>{const policy=mockSlaPolicies.find((item)=>item.priority===ticket.priority)??mockSlaPolicies[1];const metrics=getSlaMetrics(ticket,policy);if(ticket.is_breached||metrics.state==="breached")breached++;else if(metrics.state==="warning")atRisk++;});
      return {user:agent,open:assigned.length,critical:assigned.filter((t)=>t.priority==="Critical").length,high:assigned.filter((t)=>t.priority==="High").length,medium:assigned.filter((t)=>t.priority==="Medium").length,low:assigned.filter((t)=>t.priority==="Low").length,atRisk,breached};
    }).sort((a,b)=>b.open-a.open);
  },[tickets,users]);

  const average=rows.length?rows.reduce((sum,row)=>sum+row.open,0)/rows.length:0;
  const teamName=(id:string|null)=>teams.find((team)=>team.team_id===id)?.team_name??"—";
  const reassign=(ticket:Ticket)=>{setTicketForAgent(ticket);setAgentId(ticket.assignee_id??"");};
  const confirmReassign=async()=>{if(!ticketForAgent)return;try{await assignTicket(ticketForAgent.ticket_no,agentId||null,ticketForAgent.team_id);setToast(`Ticket ${ticketForAgent.ticket_no} reassigned successfully.`);setConfirm(false);setTicketForAgent(null);await load();}catch(caught){setToast(caught instanceof Error?caught.message:"Unable to reassign ticket.");setConfirm(false);}};

  return <div className={styles.ticketPage}><div><p className={styles.pageEyebrow}>Team capacity</p><h1 className={styles.pageTitle}>Workload</h1></div>
    {loading?<Skeleton label="Loading workload" rows={8}/>:error?<section className={styles.emptyState}><h2>Something went wrong</h2><p>{error}</p><button className={styles.buttonPrimary} onClick={()=>void load()} type="button">Try again</button></section>:rows.length?<>
      <p className={styles.workloadSummary}>Team average: <strong>{average.toFixed(1)}</strong> open tickets per active agent</p>
      <div className={styles.tableFrame} style={{ maxWidth: "100%", overflowX: "auto" }}><table className={styles.table}><caption className={styles.visuallyHidden}>Agent workload</caption><thead><tr><th scope="col">Agent</th><th scope="col">Team</th><th scope="col">Open</th><th scope="col">Priority mix</th><th scope="col">At risk</th><th scope="col">Breached</th><th scope="col">Load</th><th scope="col">Quick reassign</th></tr></thead><tbody>{rows.map((row)=>{const overloaded=row.open>average*1.25;const max=Math.max(1,...rows.map((item)=>item.open));return <tr className={overloaded?styles.overloadedRow:undefined} key={row.user.user_id}><td><strong>{row.user.name}</strong>{overloaded&&<span className={styles.overloadedLabel}>Overloaded</span>}</td><td>{teamName(row.user.team_id)}</td><td>{row.open}</td><td><span className={styles.priorityMix}>C {row.critical} · H {row.high} · M {row.medium} · L {row.low}</span></td><td>{row.atRisk}</td><td>{row.breached}</td><td><div aria-label={`${row.open} open tickets`} className={styles.loadTrack} role="img"><span style={{width:`${row.open/max*100}%`}} /></div></td><td><select aria-label={`Reassign an open ticket from ${row.user.name}`} className={styles.inlineSelect} defaultValue="" onChange={(event)=>{const ticket=tickets.find((item)=>item.ticket_no===event.target.value);if(ticket)reassign(ticket);}}><option value="">Choose ticket</option>{tickets.filter((ticket)=>ticket.assignee_id===row.user.user_id&&new Set(["New","Open","In Progress","On Hold","Reopened"]).has(ticket.status)).map((ticket)=><option key={ticket.ticket_no} value={ticket.ticket_no}>{ticket.ticket_no}</option>)}</select></td></tr>;})}</tbody></table></div>
      {ticketForAgent&&<ConfirmDialog open={confirm} title="Reassign ticket" description={`Choose a new agent for ${ticketForAgent.ticket_no}.`} confirmLabel="Reassign" onCancel={()=>{setConfirm(false);setTicketForAgent(null);}} onConfirm={()=>void confirmReassign()} />}
      {ticketForAgent&&<div className={styles.quickAgentSelect}><label>New agent<select value={agentId} onChange={(event)=>{setAgentId(event.target.value);setConfirm(true);}}><option value="">Select agent</option>{users.filter((user)=>user.role=== "Agent"&&user.is_active&&user.user_id!==ticketForAgent.assignee_id).map((user)=><option key={user.user_id} value={user.user_id}>{user.name}</option>)}</select></label></div>}
    </>:<EmptyState title="No agent workload" />}
    {toast&&<Toast message={toast} onClose={()=>setToast(null)}/>}
  </div>;
}
