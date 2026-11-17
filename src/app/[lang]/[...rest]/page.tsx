import { notFound } from "next/navigation";

/** Any address no page matches: the language's own 404 page. */
export default function Unmatched() {
  notFound();
}
