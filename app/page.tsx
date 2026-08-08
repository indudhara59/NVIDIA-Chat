import { auth, signIn } from "@/auth";
import { ChatShell } from "@/components/chat/chat-shell";
import { BrandMark } from "@/components/ui/brand-mark";

function GoogleIcon() {
  return <span className="google-icon" aria-hidden="true">G</span>;
}

export default async function Home() {
  const session = await auth();
  if (!session?.user?.email) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <BrandMark className="auth-mark" />
          <h1>Welcome to Nemotron Chat</h1>
          <p>Sign in to securely save and access your conversations across devices.</p>
          <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
            <button type="submit"><GoogleIcon />Continue with Google</button>
          </form>
          <small>Powered by NVIDIA Nemotron 3 Ultra</small>
        </section>
      </main>
    );
  }
  return <ChatShell user={{ name: session.user.name || "User", email: session.user.email, image: session.user.image || null }} />;
}
