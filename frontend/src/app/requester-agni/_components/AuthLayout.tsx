import Image from "next/image";
import ipecLogo from "../_assets/ipec-logo.png";

export default function AuthLayout() {
  return (
    <aside className="relative flex min-h-44 flex-col justify-between overflow-hidden bg-[#00448E] px-7 py-7 text-white sm:min-h-[590px] sm:w-[42%] sm:px-10 sm:py-10">
      <div aria-hidden="true" className="absolute -right-14 -top-20 h-64 w-64 rounded-full border border-[#E6EEF8]/20 sm:-right-20 sm:-top-16 sm:h-80 sm:w-80" />
      <div aria-hidden="true" className="absolute -right-5 top-6 h-40 w-40 rounded-full border border-[#E6EEF8]/40 sm:right-0 sm:top-16 sm:h-52 sm:w-52" />
      <a href="/requester-agni" className="relative z-10 inline-flex w-fit items-center gap-3 text-sm font-semibold tracking-[0.04em] text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#E6EEF8]">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-white p-1">
          <Image src={ipecLogo} alt="IPEC logo" width={40} height={40} className="h-full w-full rounded-full object-contain" priority />
        </span>
        IPEC Helpdesk
      </a>
      <div className="relative z-10 mt-10 max-w-xs sm:mt-0">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#E6EEF8]">Requester portal</p>
        <h1 className="text-3xl font-semibold leading-tight sm:text-[2.6rem]">A little help goes a long way.</h1>
        <p className="mt-4 max-w-[28ch] text-sm leading-6 text-white/75">Sign in to follow your requests and find answers in the knowledge base.</p>
      </div>
      <p className="relative z-10 mt-8 hidden text-xs text-[#E6EEF8] sm:block">Here for you, every step of the way.</p>
    </aside>
  );
}