// App.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";

const API_BASE = "http://localhost:5000/api";

// Define the months to display/pay for
const MONTHS = ["2025-09", "2025-10", "2025-11", "2025-12"];

// helper for short month format
const formatMonth = (m) => {
  const date = new Date(m + "-01");
  return date.toLocaleString("default", { month: "short" }); // Sep, Oct, etc.
};

export default function App() {
  const [tenants, setTenants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    flat_no: "",
    rent_amount: "",
  });
  const [editId, setEditId] = useState(null);
  const [paymentAmounts, setPaymentAmounts] = useState({}); // tenantId => { month: amount }

  const fetchTenants = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/tenants`);
      setTenants(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/payments`);
      setPayments(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTenants();
    fetchPayments();
  }, []);

  const totalTenants = tenants.length;
  const totalPaymentsReceived = payments.reduce(
    (sum, p) => sum + p.paid_amount,
    0
  );
  const pendingPayments = tenants.reduce((sum, t) => {
    const paid = payments
      .filter((p) => p.tenant_id._id === t._id)
      .reduce((s, p) => s + p.paid_amount, 0);
    return sum + Math.max(0, t.rent_amount - paid);
  }, 0);
  const recentPayments = payments
    .sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
    .slice(0, 5);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.flat_no || !form.rent_amount) return;

    try {
      if (editId) {
        await axios.put(`${API_BASE}/tenants/${editId}`, {
          ...form,
          rent_amount: Number(form.rent_amount),
        });
      } else {
        await axios.post(`${API_BASE}/tenants`, {
          ...form,
          rent_amount: Number(form.rent_amount),
        });
      }
      setForm({ name: "", phone: "", flat_no: "", rent_amount: "" });
      setEditId(null);
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  const handleEdit = (t) => {
    setForm({
      name: t.name,
      phone: t.phone || "",
      flat_no: t.flat_no,
      rent_amount: t.rent_amount,
    });
    setEditId(t._id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this tenant?")) return;
    try {
      await axios.delete(`${API_BASE}/tenants/${id}`);
      fetchTenants();
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  const handlePayment = async (tenantId, month) => {
    const amount = paymentAmounts[tenantId]?.[month];
    if (!amount) return;
    try {
      await axios.post(`${API_BASE}/payments`, {
        tenant_id: tenantId,
        month: month,
        paid_amount: Number(amount),
      });
      setPaymentAmounts((prev) => ({
        ...prev,
        [tenantId]: { ...prev[tenantId], [month]: "" },
      }));
      fetchPayments();
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  const isPaid = (tenantId, month) => {
    const pay = payments.find(
      (p) => p.tenant_id._id === tenantId && p.month === month
    );
    return pay ? pay.paid_amount : 0;
  };

  const downloadExcel = () => {
    const data = tenants.map((t) => {
      const row = {
        Name: t.name,
        Phone: t.phone,
        "Flat No": t.flat_no,
        Rent: t.rent_amount,
      };
      MONTHS.forEach((m) => {
        const paid = isPaid(t._id, m);
        row[formatMonth(m)] = paid ? paid : 0;
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rent");
    XLSX.writeFile(wb, "rent_report.xlsx");
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Rent Management Dashboard</h1>

      {/* Dashboard */}
      <div style={styles.dashboard}>
        <div style={{ ...styles.card, backgroundColor: "#3498db" }}>
          <h3>Total Tenants</h3>
          <p>{totalTenants}</p>
        </div>
        <div style={{ ...styles.card, backgroundColor: "#2ecc71" }}>
          <h3>Total Payments Received</h3>
          <p>{totalPaymentsReceived}</p>
        </div>
        <div style={{ ...styles.card, backgroundColor: "#e74c3c" }}>
          <h3>Pending Payments</h3>
          <p>{pendingPayments}</p>
        </div>
        <div style={{ ...styles.card, backgroundColor: "#f39c12" }}>
          <h3>Recent Payments</h3>
          <ul style={styles.recentList}>
            {recentPayments.map((p) => (
              <li key={p._id}>
                {p.tenant_id.name} - {p.paid_amount} ({formatMonth(p.month)})
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Tenant Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        <h2>{editId ? "Edit Tenant" : "Add Tenant"}</h2>
        <input
          style={styles.input}
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Flat No"
          value={form.flat_no}
          onChange={(e) => setForm({ ...form, flat_no: e.target.value })}
        />
        <input
          style={styles.input}
          type="number"
          placeholder="Rent Amount"
          value={form.rent_amount}
          onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
        />
        <div style={styles.formButtons}>
          <button style={styles.button} type="submit">
            {editId ? "Update" : "Add"}
          </button>
          {editId && (
            <button
              style={{ ...styles.button, backgroundColor: "#95a5a6" }}
              type="button"
              onClick={() => {
                setForm({ name: "", phone: "", flat_no: "", rent_amount: "" });
                setEditId(null);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Excel Download Button */}
      <div style={{ marginBottom: "10px" }}>
        <button style={styles.button} onClick={downloadExcel}>
          Download Excel
        </button>
      </div>

      {/* Tenant List + Payments */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Flat No</th>
              <th>Rent</th>
              {MONTHS.map((m) => (
                <th key={m}>{formatMonth(m)}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t._id} style={styles.tableRow}>
                <td>{t.name}</td>
                <td>{t.phone}</td>
                <td>{t.flat_no}</td>
                <td>{t.rent_amount}</td>
                {MONTHS.map((m) => (
                  <td key={m}>
                    {isPaid(t._id, m) ? (
                      <span style={{ color: "green", fontWeight: "bold" }}>
                        {isPaid(t._id, m)}
                      </span>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: "5px",
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="number"
                          placeholder="Amount"
                          style={styles.paymentInput}
                          value={paymentAmounts[t._id]?.[m] || ""}
                          onChange={(e) =>
                            setPaymentAmounts((prev) => ({
                              ...prev,
                              [t._id]: { ...prev[t._id], [m]: e.target.value },
                            }))
                          }
                        />
                        <button
                          style={styles.payButton}
                          onClick={() => handlePayment(t._id, m)}
                        >
                          Pay
                        </button>
                      </div>
                    )}
                  </td>
                ))}
                <td>
                  <button
                    style={styles.actionButton}
                    onClick={() => handleEdit(t)}
                  >
                    Edit
                  </button>
                  <button
                    style={{
                      ...styles.actionButton,
                      backgroundColor: "#e74c3c",
                    }}
                    onClick={() => handleDelete(t._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "1200px",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
  },
  title: { textAlign: "center", marginBottom: "30px" },
  dashboard: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "30px",
    flexWrap: "wrap",
    gap: "15px",
  },
  card: {
    flex: "1",
    color: "#fff",
    padding: "20px",
    borderRadius: "12px",
    minWidth: "200px",
    boxShadow: "5px 5px 15px rgba(0,0,0,0.3)",
    transition: "transform 0.2s",
  },
  recentList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    maxHeight: "100px",
    overflowY: "auto",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "30px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#f8f8f8",
    boxShadow: "3px 3px 10px rgba(0,0,0,0.2)",
  },
  input: {
    padding: "10px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    width: "100%",
    boxSizing: "border-box",
  },
  formButtons: { display: "flex", gap: "10px", flexWrap: "wrap" },
  button: {
    padding: "10px 20px",
    fontSize: "16px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#3498db",
    color: "#fff",
    cursor: "pointer",
  },
  tableContainer: { overflowX: "auto" },
  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0 10px",
    minWidth: "600px",
  },
  tableRow: {
    background: "#fff",
    boxShadow: "5px 5px 15px rgba(0,0,0,0.1)",
    borderRadius: "12px",
  },
  paymentInput: {
    width: "60px",
    padding: "5px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  payButton: {
    padding: "5px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#2ecc71",
    color: "#fff",
    cursor: "pointer",
    fontSize: "12px",
  },
  actionButton: {
    padding: "5px 10px",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#3498db",
    color: "#fff",
    cursor: "pointer",
    marginRight: "5px",
    marginBottom: "5px",
  },
};
