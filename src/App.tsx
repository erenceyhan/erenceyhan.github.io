import { useMemo, useState } from "react";
import { createPaymentPlan } from "./plan";
import type { InstallmentItem, ItemInput, PaymentPlan } from "./types";
import {
  escapeCsvCell,
  formatCurrency,
  formatDateInput,
  formatDisplayDate,
  roundCurrency
} from "./utils";

const initialItems: ItemInput[] = [
  { id: crypto.randomUUID(), name: "Kitap", amount: "40000" },
  { id: crypto.randomUUID(), name: "Kamp", amount: "56000" },
  { id: crypto.randomUUID(), name: "Egitim", amount: "94000" },
  { id: crypto.randomUUID(), name: "", amount: "" },
  { id: crypto.randomUUID(), name: "", amount: "" },
  { id: crypto.randomUUID(), name: "", amount: "" }
];

const today = new Date();

export default function App() {
  const [items, setItems] = useState<ItemInput[]>(initialItems);
  const [installmentCount, setInstallmentCount] = useState(7);
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(formatDateInput(today));
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [status, setStatus] = useState("Kalemleri girip hesaplama yapin.");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");

  const totals = useMemo(() => {
    if (!plan) {
      return {
        totalAmount: "-",
        monthlyPayment: "-"
      };
    }

    return {
      totalAmount: formatCurrency(plan.totalAmount),
      monthlyPayment: formatCurrency(plan.monthlyFixedPayment)
    };
  }, [plan]);

  function updateItem(id: string, key: "name" | "amount", value: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    );
  }

  function addItem() {
    setItems((current) => [...current, { id: crypto.randomUUID(), name: "", amount: "" }]);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  function calculate() {
    try {
      const parsedItems = parseItems(items);
      const parsedDate = new Date(`${firstInstallmentDate}T00:00:00`);
      const nextPlan = createPaymentPlan(parsedItems, installmentCount, parsedDate);

      setPlan(nextPlan);
      setStatus("Hesaplama tamamlandi.");
      setStatusTone("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Beklenmeyen bir hata olustu.");
      setStatusTone("error");
    }
  }

  function downloadCsv() {
    if (!plan) {
      setStatus("Once hesaplama yapip tablo olusturun.");
      setStatusTone("error");
      return;
    }

    const headers = [
      "Taksit No",
      "Taksit Tarihi",
      ...plan.items.map((item) => item.name),
      "Toplam Odeme",
      "Ay Sonu Kalan"
    ];

    const rows = plan.months.map((month) => {
      const itemCells = plan.items.map((item) => {
        const paid = month.movements.find((movement) => movement.itemName === item.name)?.paid ?? 0;
        return paid === 0 ? "-" : formatCurrency(paid);
      });

      return [
        String(month.monthNo),
        formatDisplayDate(month.installmentDate),
        ...itemCells,
        formatCurrency(month.totalPayment),
        formatCurrency(month.remainingAfterMonth)
      ];
    });

    rows.push([
      "Toplam",
      "",
      ...plan.items.map((item) => formatCurrency(item.amount)),
      formatCurrency(plan.totalAmount),
      "0,00 TL"
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(";"))
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `odeme-plani-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setStatus("CSV dosyasi indirildi.");
    setStatusTone("success");
  }

  return (
    <div className="page-shell">
      <div className="aurora aurora-left" />
      <div className="aurora aurora-right" />
      <main className="app">
        <section className="hero-card">
          <div>
            <h1>Aylik Senet Hesap</h1>
            <p className="hero-copy">
              Aylik odemeyi sabit tutar, bir kalem bittiginde kalan tutari ayni ay otomatik
              olarak sonraki kaleme aktarir.
            </p>
          </div>
          <div className="hero-stats">
            <StatCard label="Toplam Tutar" value={totals.totalAmount} />
            <StatCard label="Aylik Odeme Hedefi" value={totals.monthlyPayment} />
            <div className={`status-pill status-${statusTone}`}>{status}</div>
          </div>
        </section>

        <section className="workspace">
          <div className="panel input-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Kalem Girisi</p>
                <h2>Odeme kalemleri</h2>
              </div>
              <button className="ghost-button" type="button" onClick={addItem}>
                Kalem Ekle
              </button>
            </div>

            <div className="table-scroll">
              <table className="entry-table">
                <thead>
                  <tr>
                    <th>Kalem Adi</th>
                    <th>Tutar (TL)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          value={item.name}
                          onChange={(event) => updateItem(item.id, "name", event.target.value)}
                          placeholder="Ornek: Egitim"
                        />
                      </td>
                      <td>
                        <input
                          value={item.amount}
                          onChange={(event) => updateItem(item.id, "amount", event.target.value)}
                          inputMode="decimal"
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <button
                          className="row-remove"
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label={`${item.name || "Bos"} satirini sil`}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel controls-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Hesaplama</p>
                <h2>Plan ayarlari</h2>
              </div>
            </div>

            <p className="helper-text">
              Toplam tutar, belirlenen taksit sayisina bolunur. Bir kalem kapanirsa kalan tutar
              ayni ay sirasiyla sonraki kalemlere gecer.
            </p>

            <div className="field-grid">
              <label>
                <span>Toplam taksit sayisi</span>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={installmentCount}
                  onChange={(event) =>
                    setInstallmentCount(Math.max(1, Number(event.target.value) || 1))
                  }
                />
              </label>

              <label>
                <span>Ilk taksit tarihi</span>
                <input
                  type="date"
                  value={firstInstallmentDate}
                  onChange={(event) => setFirstInstallmentDate(event.target.value)}
                />
              </label>
            </div>

            <div className="button-row">
              <button className="primary-button" type="button" onClick={calculate}>
                Plani Hesapla
              </button>
              <button className="secondary-button" type="button" onClick={downloadCsv}>
                CSV Indir
              </button>
            </div>
          </div>
        </section>

        <section className="panel result-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">Aylik Dagilim</p>
              <h2>Odeme plani tablosu</h2>
            </div>
          </div>

          {plan ? (
            <div className="table-scroll">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>Taksit No</th>
                    <th>Taksit Tarihi</th>
                    {plan.items.map((item) => (
                      <th key={item.name}>{item.name}</th>
                    ))}
                    <th>Toplam Odeme</th>
                    <th>Ay Sonu Kalan</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.months.map((month) => (
                    <tr key={month.monthNo}>
                      <td>{month.monthNo}</td>
                      <td>{formatDisplayDate(month.installmentDate)}</td>
                      {plan.items.map((item) => {
                        const paid =
                          month.movements.find((movement) => movement.itemName === item.name)
                            ?.paid ?? 0;
                        return <td key={`${month.monthNo}-${item.name}`}>{paid ? formatCurrency(paid) : "-"}</td>;
                      })}
                      <td>{formatCurrency(month.totalPayment)}</td>
                      <td>{formatCurrency(month.remainingAfterMonth)}</td>
                    </tr>
                  ))}
                  <tr className="summary-row">
                    <td>Toplam</td>
                    <td />
                    {plan.items.map((item) => (
                      <td key={`sum-${item.name}`}>{formatCurrency(item.amount)}</td>
                    ))}
                    <td>{formatCurrency(plan.totalAmount)}</td>
                    <td>0,00 TL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Tablo burada olusacak.</p>
              <span>Ornek kalemlerle hemen hesaplama yapabilirsin.</span>
            </div>
          )}
        </section>

        <footer className="site-footer">
          <span>© 2026 Eren Ceyhan</span>
          <span>Aylik Senet Hesap</span>
        </footer>
      </main>
    </div>
  );
}

function parseItems(items: ItemInput[]): InstallmentItem[] {
  const parsedItems: InstallmentItem[] = [];

  for (const item of items) {
    const name = item.name.trim();
    const amountText = item.amount.trim();

    if (!name && !amountText) {
      continue;
    }

    if (!name) {
      throw new Error("Kalem adlarindan biri bos.");
    }

    const normalizedAmount = amountText.replace(/\./g, "").replace(",", ".");
    const amount = Number(normalizedAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error(`'${name}' kalemi icin gecerli bir tutar girin.`);
    }

    parsedItems.push({
      name,
      amount: roundCurrency(amount)
    });
  }

  if (parsedItems.length === 0) {
    throw new Error("En az bir kalem girmeniz gerekiyor.");
  }

  return parsedItems;
}

function StatCard(props: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </article>
  );
}
