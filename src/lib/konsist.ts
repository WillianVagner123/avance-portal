export async function fetchKonsistAgendamentos(
  datai: string,
  dataf: string
) {
  const base = process.env.KONSIST_API_BASE!;
  const endpoint = process.env.KONSIST_ENDPOINT_AGENDAMENTOS!;
  const token = process.env.KONSIST_BEARER!;

  const url = `${base}${endpoint}?datai=${datai}&dataf=${dataf}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Konsist error ${res.status}: ${text}`);
  }

  return res.json();
}
