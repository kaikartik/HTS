import Image from "next/image";
import type { ReactNode } from "react";
import ipecLogo from "../_assets/ipec-logo.png";
import { themeClasses } from "../_lib/theme";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className={`flex min-h-dvh flex-col ${themeClasses.page} md:items-center md:justify-center md:p-8`}>
      <div className="flex min-h-dvh w-full max-w-5xl flex-1 flex-col bg-[#FFFFFF] shadow-[0_24px_80px_rgba(15,31,51,0.12)] md:min-h-[590px] md:flex-row md:flex-none md:overflow-hidden md:rounded-[10px]">
        <aside className={`relative z-0 flex h-[104px] shrink-0 items-center overflow-hidden px-6 text-white md:h-auto md:min-h-[590px] md:w-[42%] md:flex-col md:items-stretch md:justify-between md:px-10 md:py-10 ${themeClasses.authPanel}`}>
          <div aria-hidden="true" className={`absolute -right-14 -top-20 hidden h-64 w-64 rounded-full md:-right-20 md:-top-16 md:block md:h-80 md:w-80 ${themeClasses.authPanelDecorationSoft}`} />
          <div aria-hidden="true" className={`absolute -right-5 top-6 hidden h-40 w-40 rounded-full md:right-0 md:top-16 md:block md:h-52 md:w-52 ${themeClasses.authPanelDecoration}`} />
          <a href="/requester-agni" className={`relative z-10 inline-flex w-fit items-center gap-3 text-sm font-semibold tracking-[0.04em] text-white focus-visible:outline-2 focus-visible:outline-offset-4 ${themeClasses.authPanelFocus}`}>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white p-1 md:h-11 md:w-11">
              <Image src={ipecLogo} alt="IPEC logo" width={40} height={40} className="h-full w-full rounded-full object-contain" priority />
            </span>
            IPEC Helpdesk
          </a>
          <div className="relative z-10 mt-10 hidden max-w-xs md:mt-0 md:block">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#E6EEF8]">Requester portal</p>
            <h1 className="text-3xl font-semibold leading-tight md:text-[2.6rem]">A little help goes a long way.</h1>
            <p className="mt-4 max-w-[28ch] text-sm leading-6 text-white/75">Sign in to follow your requests and find answers in the knowledge base.</p>
          </div>
          <p className="relative z-10 mt-8 hidden text-xs text-[#E6EEF8] md:block">Here for you, every step of the way.</p>
        </aside>

        <section className="relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[24px] bg-[#FFFFFF] px-6 pt-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:mt-0 md:rounded-none md:px-12 md:py-12 lg:px-16">
          <div className="auth-form-content mx-auto w-full max-w-sm md:my-auto">{children}</div>
          <footer className="mt-auto flex flex-col items-center gap-1 pt-8 text-center text-xs text-[#5B6B80]">
            <p>Need help? Contact the IT helpdesk</p>
            <p>© 2026 IPEC</p>
          </footer>
        </section>
      </div>
      <style jsx>{`
        @keyframes auth-fade-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .auth-form-content { animation: auth-fade-up 200ms ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .auth-form-content { animation: none; }
        }
      `}</style>
    </main>
  );
}