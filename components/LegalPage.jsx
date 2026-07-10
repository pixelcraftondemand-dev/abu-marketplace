import Link from "next/link";

const policyLinks = [
    { label: "Terms & Conditions", href: "/terms-and-conditions" },
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Cookie Policy", href: "/cookie-policy" },
];

const LegalPage = ({ title, updated, intro, sections }) => {
    return (
        <main className="mx-6 py-12">
            <div className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-[260px_1fr]">
                <aside className="lg:sticky lg:top-8 h-fit rounded-lg border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal Center</p>
                    <nav className="mt-4 flex flex-col gap-2 text-sm">
                        {policyLinks.map((link) => (
                            <Link key={link.href} href={link.href} className="rounded-md px-3 py-2 text-slate-600 hover:bg-white hover:text-green-600">
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                </aside>

                <article className="rounded-lg border border-slate-200 bg-white p-6 sm:p-10">
                    <p className="text-sm font-medium text-green-600">Updated {updated}</p>
                    <h1 className="mt-3 text-3xl font-semibold text-slate-800 sm:text-4xl">{title}</h1>
                    <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-600">{intro}</p>

                    <div className="mt-10 space-y-8">
                        {sections.map((section) => (
                            <section key={section.heading}>
                                <h2 className="text-xl font-semibold text-slate-800">{section.heading}</h2>
                                <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
                                    {section.body.map((paragraph) => (
                                        <p key={paragraph}>{paragraph}</p>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                </article>
            </div>
        </main>
    );
};

export default LegalPage;
