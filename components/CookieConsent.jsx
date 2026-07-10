'use client'

import Link from "next/link";
import { useEffect, useState } from "react";

const CookieConsent = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(localStorage.getItem("abu-cookie-choice") === null);
    }, []);

    const saveChoice = (choice) => {
        localStorage.setItem("abu-cookie-choice", choice);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-4 shadow-2xl sm:flex sm:items-center sm:justify-between sm:gap-5">
            <div>
                <p className="font-medium text-slate-800">Cookies help ABU Marketplace work better.</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                    We use essential cookies for login, cart, and checkout, plus optional cookies to improve offers and product discovery. Read our{" "}
                    <Link href="/cookie-policy" className="font-medium text-green-600 hover:underline">Cookie Policy</Link>.
                </p>
            </div>
            <div className="mt-4 flex shrink-0 gap-2 sm:mt-0">
                <button onClick={() => saveChoice("essential")} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Essential only
                </button>
                <button onClick={() => saveChoice("accepted")} className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900">
                    Accept
                </button>
            </div>
        </div>
    );
};

export default CookieConsent;
