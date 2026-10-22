import Link from "next/link";
import { signOut } from "@/app/login/actions";

export default function NoCreator() {
  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl">We couldn&apos;t find your account</h1>
      <p className="mt-4 leading-relaxed text-haze">
        Sign in with the same email you used when you signed up. If you haven&apos;t signed up yet, start here.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/start" className="btn">Get protected</Link>
        <form action={signOut}><button className="btn-ghost">Use a different email</button></form>
      </div>
    </div>
  );
}
