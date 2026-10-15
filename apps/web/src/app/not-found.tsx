import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="page">
      <div className="content" style={{ textAlign: "center" }}>
        <h1 className="t-title">Nothing on this plate</h1>
        <p className="muted">That page isn&rsquo;t on the menu.</p>
        <Link className="btn primary" href="/">
          Play today&rsquo;s Foodle
        </Link>
      </div>
    </main>
  );
}
