"use client";
import CalendarPretty from "./CalendarPretty";

type Mode = "admin" | "professional";

type Props = {
  mode: Mode;
  title?: string;
  subtitle?: string;
};

export default function CalendarClient(props: Props) {
  return <CalendarPretty {...props} />;
}
