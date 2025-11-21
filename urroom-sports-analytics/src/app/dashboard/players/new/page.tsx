"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import styles from "./CreatePlayerPage.module.css";

export default function CreatePlayerPage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    positions: [""],
    foot: "",
    nationality: "",
    height: "",
    weight: "",
    photo: null,
  });

  const allPositions = [
    "Gardien", "Latéral droit", "Défenseur central", "Latéral gauche", 
    "Milieu défensif", "Milieu central", "Milieu offensif", 
    "Ailier droit", "Ailier gauche", "Attaquant", "Avant-centre", "Second attaquant"
  ];
  const allFeet = ["Droitier", "Gaucher", "Ambidextre"];
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: any, idx?: number) => {
    const { name, value, files } = e.target;
    if (name === "photo" && files && files[0]) {
      setForm(f => ({ ...f, photo: files[0] }));
      setPreview(URL.createObjectURL(files[0]));
    } else if (name === "positions" && typeof idx === 'number') {
      setForm(f => {
        const arr = [...f.positions];
        arr[idx] = value;
        return { ...f, positions: arr };
      });
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleAddPosition = () => {
    setForm(f => ({ ...f, positions: [...f.positions, ""] }));
  };

  const handleRemovePosition = (idx: number) => {
    setForm(f => ({ ...f, positions: f.positions.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "photo" && v instanceof File) formData.append(k, v);
        else if (k === "positions") formData.append(k, JSON.stringify(v));
        else if (k !== "photo") formData.append(k, typeof v === 'string' ? v : String(v));
      });
      
      const res = await fetch("/api/players", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Erreur lors de la création du joueur");
      router.push("/dashboard/players");
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Créer un joueur</h1>
          <p className={styles.subtitle}>Remplissez les informations du joueur</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Photo Section */}
          <div className={styles.photoSection}>
            <label htmlFor="photo" className={styles.photoLabel}>
              <Image
                src={preview || "/cercle-bleu-utilisateur-blanc.png"}
                alt="Photo joueur"
                width={80}
                height={80}
                className={styles.photoPreview}
              />
              <input
                type="file"
                id="photo"
                name="photo"
                accept="image/*"
                className={styles.photoInput}
                onChange={handleChange}
              />
            </label>
            <div>
              <div className={styles.photoIcon}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A1 1 0 0011.879 2H8.12a1 1 0 00-.707.293L6.293 3.414A1 1 0 015.586 4H4zm6 9a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <p className={styles.photoText}>
                {form.photo ? "✓ Photo sélectionnée" : "Ajouter une photo du joueur"}
              </p>
            </div>
          </div>

          {/* Nom et Prénom */}
          <div className={styles.inputRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Prénom <span className={styles.required}>*</span>
              </label>
              <input
                name="firstName"
                placeholder="Ex: Stellio"
                value={form.firstName}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Nom <span className={styles.required}>*</span>
              </label>
              <input
                name="lastName"
                placeholder="Ex: Eklou"
                value={form.lastName}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>
          </div>

          {/* Date de naissance */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Date de naissance <span className={styles.required}>*</span>
            </label>
            <input
              name="birthDate"
              type="date"
              value={form.birthDate}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          {/* Postes */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Poste(s) <span className={styles.required}>*</span>
            </label>
            <div className={styles.positionsSection}>
              {form.positions.map((pos, idx) => (
                <div key={idx} className={styles.positionRow}>
                  <select
                    name="positions"
                    value={pos}
                    onChange={e => handleChange(e, idx)}
                    required
                    className={styles.positionSelect}
                  >
                    <option value="">Sélectionner un poste</option>
                    {allPositions.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                  {pos && (
                    <div className={styles.checkIcon}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8L6 11L13 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  {form.positions.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => handleRemovePosition(idx)} 
                      className={styles.removeButton}
                      title="Supprimer ce poste"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button 
                type="button" 
                onClick={handleAddPosition} 
                className={styles.addPositionButton}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Ajouter un poste
              </button>
            </div>
          </div>

          {/* Pied fort */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Pied fort <span className={styles.required}>*</span>
            </label>
            <select
              name="foot"
              value={form.foot}
              onChange={handleChange}
              required
              className={styles.select}
            >
              <option value="">Sélectionner</option>
              {allFeet.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Nationalité */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Nationalité <span className={styles.required}>*</span>
            </label>
            <input
              name="nationality"
              placeholder="Ex: Belge"
              value={form.nationality}
              onChange={handleChange}
              required
              className={styles.input}
            />
          </div>

          {/* Taille et Poids */}
          <div className={styles.inputRow}>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Taille <span className={styles.inputIcon}>(cm)</span>
              </label>
              <input
                name="height"
                placeholder="172"
                value={form.height}
                onChange={handleChange}
                type="number"
                min={100}
                max={250}
                className={styles.input}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>
                Poids <span className={styles.inputIcon}>(kg)</span>
              </label>
              <input
                name="weight"
                placeholder="69"
                value={form.weight}
                onChange={handleChange}
                type="number"
                min={30}
                max={150}
                className={styles.input}
              />
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? "Création en cours..." : "Créer le joueur"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/players")}
              className={styles.cancelButton}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
