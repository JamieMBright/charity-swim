import type { Metadata } from "next";

import { UpdateForm } from "@/components/update-form";
import { getProgressData } from "@/lib/progress";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Swim update",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function UpdatePage() {
  const progress = await getProgressData();

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eef9ff_0%,#f7fbff_100%)] px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <section className="rounded-[2rem] bg-white p-6 shadow-[0_24px_80px_rgba(34,91,124,0.14)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
            Private update form
          </p>
          <h1 className="mt-3 text-3xl font-bold text-slate-900">
            Log today&apos;s swim
          </h1>
          <p className="mt-3 text-slate-600">
            Add either miles or pool lengths. Lengths are converted using a 25m pool.
          </p>
        </section>

        <UpdateForm
          defaultDate={new Date().toISOString().slice(0, 10)}
          initialTotalMiles={progress.totalMiles}
          targetMiles={progress.targetMiles}
        />
      </div>
    </main>
  );
}
