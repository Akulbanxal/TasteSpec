import React, { useState } from 'react';
import { Dialog } from './common/Dialog.js';
import { Button } from './common/Button.js';
import {
  type EvaluationScenario,
  type SupportedDomain,
  VERIFIED_FILTER_TYPES,
  SupportedDomainEnum
} from '@shared/index';

interface ScenarioBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateScenario: (scenario: EvaluationScenario) => void;
}

export const ScenarioBuilderModal: React.FC<ScenarioBuilderModalProps> = ({
  isOpen,
  onClose,
  onCreateScenario
}) => {
  const [title, setTitle] = useState('');
  const [personaName, setPersonaName] = useState('');
  const [description, setDescription] = useState('');
  const [seedName, setSeedName] = useState('');
  const [seedDomain, setSeedDomain] = useState<SupportedDomain>('music');
  const [seeds, setSeeds] = useState<Array<{ name: string; domain: SupportedDomain }>>([]);
  const [targetDomain, setTargetDomain] = useState<SupportedDomain>('place');
  const [targetCategoryUrn, setTargetCategoryUrn] = useState<string>('urn:entity:place');
  const [city, setCity] = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [minAffinity, setMinAffinity] = useState('0.60');
  const [forbiddenText, setForbiddenText] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleAddSeed = () => {
    if (!seedName.trim()) return;
    setSeeds([...seeds, { name: seedName.trim(), domain: seedDomain }]);
    setSeedName('');
  };

  const handleRemoveSeed = (idx: number) => {
    setSeeds(seeds.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: string[] = [];

    if (!title.trim()) errors.push('Scenario title is required.');
    if (!personaName.trim()) errors.push('Persona name is required.');
    if (seeds.length === 0) errors.push('At least one cultural seed anchor is required.');
    if (!targetCategoryUrn.startsWith('urn:')) errors.push('Target category URN must begin with "urn:".');

    const affinityNum = parseFloat(minAffinity);
    if (isNaN(affinityNum) || affinityNum < 0 || affinityNum > 1) {
      errors.push('Min affinity must be a number between 0.0 and 1.0.');
    }

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    const forbiddenAttributes = forbiddenText
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => s.length > 0);

    const newScenario: EvaluationScenario = {
      id: `custom_${Date.now()}`,
      title: title.trim(),
      personaName: personaName.trim(),
      description: description.trim() || `Custom test scenario for ${personaName.trim()}.`,
      seeds,
      targetDomain,
      location: city.trim() ? { city: city.trim(), countryCode: countryCode.trim().toUpperCase() || 'US' } : undefined,
      constraints: {
        minEmpiricalAffinity: affinityNum,
        forbiddenAttributes,
        requiredAttributes: [],
        targetCategoryUrn
      }
    };

    onCreateScenario(newScenario);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      title="Create Custom Cultural Test Scenario"
      onClose={onClose}
      maxWidth="620px"
      actions={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" onClick={handleSubmit}>
            Save & Load Scenario
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', fontSize: '0.82rem' }}>
        {validationErrors.length > 0 && (
          <div style={{ padding: '0.65rem 0.85rem', background: 'var(--status-fail-subtle)', border: '1px solid var(--status-fail-border)', borderRadius: 'var(--radius-xs)', color: 'var(--status-fail)' }}>
            <strong>Please correct the following:</strong>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Scenario Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Kyoto Minimalist Architecture to Tea"
              style={{
                width: '100%',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.5rem',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Persona Name *
            </label>
            <input
              type="text"
              value={personaName}
              onChange={e => setPersonaName(e.target.value)}
              placeholder="e.g. Wabi-Sabi Tea Master"
              style={{
                width: '100%',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.5rem',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
            Description (Optional)
          </label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Brief explanation of test objective..."
            style={{
              width: '100%',
              background: 'var(--bg-surface-0)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xs)',
              padding: '0.45rem',
              color: 'var(--text-primary)',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Seed Anchors */}
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
            Cultural Seed Anchors * (Entities to resolve in Qloo)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={seedName}
              onChange={e => setSeedName(e.target.value)}
              placeholder="Seed entity (e.g. Tadao Ando, Radiohead)"
              style={{
                flex: 1,
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.45rem',
                color: 'var(--text-primary)'
              }}
            />
            <select
              value={seedDomain}
              onChange={e => setSeedDomain(e.target.value as SupportedDomain)}
              style={{
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.45rem',
                color: 'var(--text-primary)'
              }}
            >
              {SupportedDomainEnum.options.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <Button type="button" size="sm" variant="secondary" onClick={handleAddSeed}>
              + Add Seed
            </Button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
            {seeds.map((s, idx) => (
              <span
                key={idx}
                style={{
                  background: 'var(--bg-surface-2)',
                  border: '1px solid var(--border-cyan)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '0.74rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span>{s.name} ({s.domain})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSeed(idx)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--status-fail)', cursor: 'pointer', padding: 0 }}
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Target Category & Verified URN */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Target Domain *
            </label>
            <select
              value={targetDomain}
              onChange={e => setTargetDomain(e.target.value as SupportedDomain)}
              style={{
                width: '100%',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.5rem',
                color: 'var(--text-primary)'
              }}
            >
              {SupportedDomainEnum.options.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Insights Target URN * (Verified Contract)
            </label>
            <select
              value={targetCategoryUrn}
              onChange={e => setTargetCategoryUrn(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.5rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)'
              }}
            >
              {VERIFIED_FILTER_TYPES.map(urn => (
                <option key={urn} value={urn}>{urn}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Location & Min Affinity */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              City (Optional)
            </label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g. Kyoto, Tokyo, Paris"
              style={{
                width: '100%',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.45rem',
                color: 'var(--text-primary)',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Country
            </label>
            <input
              type="text"
              maxLength={2}
              value={countryCode}
              onChange={e => setCountryCode(e.target.value.toUpperCase())}
              placeholder="US"
              style={{
                width: '100%',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.45rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
              Min Affinity
            </label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={minAffinity}
              onChange={e => setMinAffinity(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-xs)',
                padding: '0.45rem',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Forbidden Attributes */}
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
            Forbidden Attributes (Comma-separated, invalidates matches)
          </label>
          <input
            type="text"
            value={forbiddenText}
            onChange={e => setForbiddenText(e.target.value)}
            placeholder="e.g. fast-fashion, tourist-trap, commercial"
            style={{
              width: '100%',
              background: 'var(--bg-surface-0)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xs)',
              padding: '0.45rem',
              color: 'var(--text-primary)',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </form>
    </Dialog>
  );
};
