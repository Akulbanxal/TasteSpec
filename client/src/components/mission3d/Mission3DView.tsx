import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Panel } from '../common/Panel.js';
import { Button } from '../common/Button.js';
import { StatusBadge } from '../common/StatusBadge.js';
import { CodeViewer } from '../common/CodeViewer.js';
import {
  MISSION_CHECKPOINTS,
  mapJobStatusToMissionState,
  type RealMissionState,
  type MissionCheckpoint
} from './missionState.js';
import { MissionChamberScene } from './MissionChamberScene.js';
import type { EvaluationScenario, EvaluationJobStatus } from '@shared/index';

interface Mission3DViewProps {
  selectedScenario: EvaluationScenario | null;
  onNavigateToTestbench?: () => void;
  onNavigateToResults?: () => void;
}

export const Mission3DView: React.FC<Mission3DViewProps> = ({
  selectedScenario,
  onNavigateToTestbench,
  onNavigateToResults
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MissionChamberScene | null>(null);

  // Real backend execution state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<EvaluationJobStatus | null>(null);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>('contract_validation');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [isAnimationPaused, setIsAnimationPaused] = useState<boolean>(false);
  const [webGlSupported, setWebGlSupported] = useState<boolean>(true);

  // Poll controller refs to prevent duplicate subscriptions or leaks
  const pollTimerRef = useRef<any>(null);
  const isMountedRef = useRef<boolean>(true);

  // Test input state
  const [rawAgentInput, setRawAgentInput] = useState<string>('The Four Horsemen\nTen Bells');
  const [forceFailScenario, setForceFailScenario] = useState<boolean>(false);

  // Derived real mission state from actual backend job status
  const missionState: RealMissionState = useMemo(() => {
    return mapJobStatusToMissionState(jobStatus, selectedCheckpointId);
  }, [jobStatus, selectedCheckpointId]);

  // Clean polling lifecycle controller
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(async (runId: string) => {
    if (!isMountedRef.current) return;

    try {
      const res = await fetch(`/api/eval/${encodeURIComponent(runId)}/status`);
      if (!res.ok) {
        throw new Error(`Failed to fetch job status: HTTP ${res.status}`);
      }
      const data: EvaluationJobStatus = await res.json();

      if (!isMountedRef.current) return;
      setJobStatus(data);
      setNetworkError(null);

      // Stop polling when a terminal state is reached
      if (data.isTerminal) {
        setIsExecuting(false);
        stopPolling();
      } else {
        // Bounded polling interval: 400ms during active run
        pollTimerRef.current = setTimeout(() => {
          pollJobStatus(runId);
        }, 400);
      }
    } catch (err: any) {
      if (!isMountedRef.current) return;
      setNetworkError(err.message || 'Network error polling evaluation status');
      setIsExecuting(false);
      stopPolling();
    }
  }, [stopPolling]);

  // Mount/unmount cleanup: ensure timers and scene are cleanly terminated
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  // Check WebGL availability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGlSupported(false);
      }
    } catch {
      setWebGlSupported(false);
    }
  }, []);

  // Initialize isolated Three.js canvas
  useEffect(() => {
    if (!webGlSupported || !containerRef.current) return;

    let scene: MissionChamberScene | null = null;
    try {
      scene = new MissionChamberScene(containerRef.current, {
        onSelectCheckpoint: (id) => setSelectedCheckpointId(id)
      });
      sceneRef.current = scene;
      scene.setRobotTargetCheckpoint(selectedCheckpointId);
    } catch (err) {
      console.warn('Three.js scene init failed, falling back to 2D matrix:', err);
      setWebGlSupported(false);
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && sceneRef.current) {
          sceneRef.current.handleResize(width, height);
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    const handleVisibility = () => {
      if (document.hidden) {
        sceneRef.current?.pause();
      } else if (!isAnimationPaused) {
        sceneRef.current?.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      resizeObserver.disconnect();
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
    };
  }, [webGlSupported]);

  // Animate robot toward active checkpoint when backend stage event arrives
  useEffect(() => {
    if (sceneRef.current) {
      // Robot moves to active stage or explicitly inspected checkpoint
      const targetCheckpoint = MISSION_CHECKPOINTS[missionState.activeCheckpointIndex] || MISSION_CHECKPOINTS[0];
      sceneRef.current.setRobotTargetCheckpoint(targetCheckpoint.id);

      // Update beacon crystal colors based on real backend evaluation statuses
      MISSION_CHECKPOINTS.forEach((cp) => {
        const status = missionState.checkpointStatuses[cp.id] || 'idle';
        sceneRef.current?.updateCheckpointStatus(cp.id, status);
      });
    }
  }, [missionState.activeCheckpointIndex, missionState.checkpointStatuses]);

  // Synchronize robot target with user click/selection
  useEffect(() => {
    if (sceneRef.current && selectedCheckpointId) {
      sceneRef.current.setRobotTargetCheckpoint(selectedCheckpointId);
    }
  }, [selectedCheckpointId]);

  // Execute actual backend evaluation pass
  const handleStartRealEvaluation = async (overrideFailure = false) => {
    stopPolling();
    setIsExecuting(true);
    setNetworkError(null);
    setJobStatus(null);

    const baseScenario: EvaluationScenario = selectedScenario || {
      id: 'scen_brooklyn_indie_natural_wine',
      title: 'Brooklyn Neo-Psychedelia to Natural Wine',
      personaName: 'East Williamsburg Indie Audiophile',
      description: 'Tests if agent recommendations for nightlife/dining ground properly.',
      seeds: [{ name: 'Stereolab', domain: 'music', resolvedQlooId: 'ent_demo_stereolab' }],
      targetDomain: 'place',
      constraints: {
        minEmpiricalAffinity: 0.65,
        forbiddenAttributes: ['commercial_sports_bar'],
        requiredAttributes: ['natural_wine'],
        targetCategoryUrn: overrideFailure || forceFailScenario ? 'urn:invalid:unsupported_urn' : 'urn:entity:place'
      }
    };

    try {
      const res = await fetch('/api/eval/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: baseScenario,
          inputMode: 'paste_output',
          rawAgentOutput: rawAgentInput
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const initialJob: EvaluationJobStatus = await res.json();
      setActiveJobId(initialJob.runId);
      setJobStatus(initialJob);

      // Start bounded polling
      pollJobStatus(initialJob.runId);
    } catch (err: any) {
      setNetworkError(err.message || 'Failed to dispatch evaluation job');
      setIsExecuting(false);
    }
  };

  // Toggle animation pause/resume without faking or pausing backend evaluation
  const handleToggleAnimationPause = () => {
    if (isAnimationPaused) {
      sceneRef.current?.resume();
      setIsAnimationPaused(false);
    } else {
      sceneRef.current?.pause();
      setIsAnimationPaused(true);
    }
  };

  const selectedCheckpoint = useMemo<MissionCheckpoint>(() => {
    return (
      MISSION_CHECKPOINTS.find((c) => c.id === selectedCheckpointId) ||
      MISSION_CHECKPOINTS[0]
    );
  }, [selectedCheckpointId]);

  const activeDiagnostic = missionState.diagnostics[selectedCheckpoint.id];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              TASTESPEC 3D Agent Mission Chamber
            </h1>
            <span
              style={{
                fontSize: '0.68rem',
                fontFamily: 'var(--font-mono)',
                padding: '0.15rem 0.45rem',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--status-pass)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}
            >
              REAL BACKEND STAGE TRACKER
            </span>
          </div>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Empirical test world synchronized with live backend evaluation stages, candidate evidence retrieval, and deterministic rules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Button
            size="sm"
            variant="primary"
            loading={isExecuting}
            onClick={() => handleStartRealEvaluation(false)}
          >
            Run Real Evaluation
          </Button>

          <Button
            size="sm"
            variant="danger"
            disabled={isExecuting}
            onClick={() => handleStartRealEvaluation(true)}
            title="Runs scenario with an invalid URN to test genuine stage failure stopping"
          >
            Trigger Stage Failure
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleAnimationPause}
          >
            {isAnimationPaused ? 'Resume Animation' : 'Pause Animation'}
          </Button>

          {onNavigateToResults && (
            <Button size="sm" variant="secondary" onClick={onNavigateToResults}>
              Audit Results Matrix
            </Button>
          )}

          {onNavigateToTestbench && (
            <Button size="sm" variant="ghost" onClick={onNavigateToTestbench}>
              Testbench
            </Button>
          )}
        </div>
      </div>

      {/* Network or Error Banner */}
      {networkError && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'var(--status-fail-subtle)',
            border: '1px solid var(--status-fail-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-fail)',
            fontSize: '0.8rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span>
            <strong>Backend Connection Alert:</strong> {networkError}
          </span>
          <Button size="sm" variant="danger" onClick={() => setNetworkError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      {/* Stage Progress & Diagnostic Banner */}
      <div
        style={{
          padding: '0.65rem 1rem',
          background: 'var(--bg-surface-1)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.76rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Backend Stage:</span>
          <StatusBadge
            status={
              missionState.hasFailure
                ? 'FAIL'
                : missionState.currentStage === 'evaluation_completed'
                ? 'PASS'
                : missionState.currentStage !== 'idle'
                ? 'LIVE'
                : 'NEUTRAL'
            }
            label={missionState.currentStage.toUpperCase().replace('_', ' ')}
          />
          {activeJobId && (
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
              ({activeJobId})
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={forceFailScenario}
              onChange={(e) => setForceFailScenario(e.target.checked)}
              disabled={isExecuting}
            />
            Invalid URN Mode
          </label>

          <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Events: {missionState.events.length}
          </span>
        </div>
      </div>

      {/* Main Chamber & Inspector Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(480px, 2fr) minmax(340px, 1.1fr)', gap: '1.25rem' }}>
        {/* 3D Canvas Chamber */}
        <Panel
          title="Procedural Test Chamber"
          subtitle="Real backend evaluation events drive robot navigation and checkpoint state"
          badge={
            webGlSupported ? (
              <StatusBadge status="LIVE" label="THREE.JS CANVAS" showIcon={false} />
            ) : (
              <StatusBadge status="WARNING" label="2D MATRIX FALLBACK" showIcon={false} />
            )
          }
        >
          {webGlSupported ? (
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '460px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                background: '#030509',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div
                ref={containerRef}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block'
                }}
              />

              {/* In-Chamber HUD Overlay */}
              <div
                style={{
                  position: 'absolute',
                  top: '0.75rem',
                  left: '0.75rem',
                  background: 'rgba(10, 15, 28, 0.80)',
                  backdropFilter: 'blur(12px)',
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-xs)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.72rem',
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none'
                }}
              >
                <div>Explorer Unit: <strong>TasteSpec Drone-01</strong></div>
                <div style={{ color: 'var(--cyan-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', marginTop: '0.15rem' }}>
                  Target: {selectedCheckpoint.label}
                </div>
                {missionState.hasFailure && (
                  <div style={{ color: 'var(--status-fail)', fontWeight: 600, fontSize: '0.68rem', marginTop: '0.2rem' }}>
                    STOPPED AT FAILED STAGE
                  </div>
                )}
              </div>

              {/* Accessible Interactive Checkpoint Bar at Chamber Bottom */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '0.75rem',
                  left: '0.75rem',
                  right: '0.75rem',
                  display: 'flex',
                  gap: '0.4rem',
                  background: 'rgba(6, 9, 17, 0.85)',
                  backdropFilter: 'blur(8px)',
                  padding: '0.45rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-medium)',
                  overflowX: 'auto'
                }}
              >
                {MISSION_CHECKPOINTS.map((cp, idx) => {
                  const isSelected = cp.id === selectedCheckpointId;
                  const status = missionState.checkpointStatuses[cp.id] || 'idle';

                  return (
                    <button
                      key={cp.id}
                      onClick={() => setSelectedCheckpointId(cp.id)}
                      aria-label={`Inspect ${cp.label}`}
                      style={{
                        flex: 1,
                        minWidth: '105px',
                        padding: '0.4rem 0.5rem',
                        borderRadius: 'var(--radius-xs)',
                        border: isSelected ? '1px solid var(--cyan-primary)' : '1px solid var(--border-subtle)',
                        background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-surface-0)',
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.7rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.15rem',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>0{idx + 1}</span>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background:
                              status === 'completed'
                                ? 'var(--status-pass)'
                                : status === 'active'
                                ? 'var(--cyan-primary)'
                                : status === 'failed'
                                ? 'var(--status-fail)'
                                : status === 'warning'
                                ? 'var(--status-warn)'
                                : 'var(--text-disabled)'
                          }}
                        />
                      </div>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cp.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* 2D Fallback for Low-Power Devices */
            <div
              style={{
                height: '460px',
                background: 'var(--bg-surface-0)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                justifyContent: 'center'
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Accessible 2D Stage Monitor
                </h3>
                <p style={{ margin: '0.2rem 0', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  WebGL unavailable. Visualizing backend execution progression through accessible 2D telemetry.
                </p>
              </div>

              {MISSION_CHECKPOINTS.map((cp, idx) => {
                const isSelected = cp.id === selectedCheckpointId;
                const status = missionState.checkpointStatuses[cp.id] || 'idle';

                return (
                  <div
                    key={cp.id}
                    onClick={() => setSelectedCheckpointId(cp.id)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--bg-surface-2)' : 'var(--bg-surface-1)',
                      border: isSelected ? '1px solid var(--border-cyan)' : '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--cyan-primary)' }}>
                        0{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          {cp.label}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {cp.sublabel}
                        </div>
                      </div>
                    </div>
                    <StatusBadge
                      status={
                        status === 'completed'
                          ? 'PASS'
                          : status === 'active'
                          ? 'LIVE'
                          : status === 'failed'
                          ? 'FAIL'
                          : status === 'warning'
                          ? 'WARNING'
                          : 'NEUTRAL'
                      }
                      label={status.toUpperCase()}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        {/* Checkpoint Detail & Diagnostic Inspector Panel */}
        <Panel
          title="Stage Diagnostic Inspector"
          subtitle={`Checkpoint 0${selectedCheckpoint.stepNumber}: ${selectedCheckpoint.label}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Checkpoint Status
              </span>
              <StatusBadge
                status={
                  missionState.checkpointStatuses[selectedCheckpoint.id] === 'completed'
                    ? 'PASS'
                    : missionState.checkpointStatuses[selectedCheckpoint.id] === 'active'
                    ? 'LIVE'
                    : missionState.checkpointStatuses[selectedCheckpoint.id] === 'failed'
                    ? 'FAIL'
                    : missionState.checkpointStatuses[selectedCheckpoint.id] === 'warning'
                    ? 'WARNING'
                    : 'NEUTRAL'
                }
                label={(missionState.checkpointStatuses[selectedCheckpoint.id] || 'IDLE').toUpperCase()}
              />
            </div>

            {/* Stage Diagnostic Telemetry */}
            {activeDiagnostic ? (
              <div
                style={{
                  background: activeDiagnostic.isError ? 'var(--status-fail-subtle)' : 'var(--bg-surface-0)',
                  border: `1px solid ${activeDiagnostic.isError ? 'var(--status-fail-border)' : 'var(--border-subtle)'}`,
                  padding: '0.75rem',
                  borderRadius: 'var(--radius-xs)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: activeDiagnostic.isError ? 'var(--status-fail)' : 'var(--cyan-primary)', textTransform: 'uppercase' }}>
                    {activeDiagnostic.isError ? 'Stage Failure Diagnostic' : 'Live Event Summary'}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {new Date(activeDiagnostic.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                  {activeDiagnostic.summary}
                </div>
                {activeDiagnostic.errorCode && (
                  <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--status-fail)' }}>
                    Code: {activeDiagnostic.errorCode}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '0.65rem', background: 'var(--bg-surface-0)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-xs)', color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                Awaiting backend event for this checkpoint. Trigger an evaluation run above to observe live stage telemetry.
              </div>
            )}

            {/* Operational Description */}
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                Operational Function
              </span>
              <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.4, fontSize: '0.78rem' }}>
                {selectedCheckpoint.description}
              </p>
            </div>

            {/* Real Evidence Link */}
            {missionState.report && (
              <div style={{ background: 'var(--bg-surface-0)', padding: '0.75rem', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Audited Report Summary
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ background: 'var(--status-pass-subtle)', padding: '0.3rem', borderRadius: 'var(--radius-xs)', color: 'var(--status-pass)', fontWeight: 700 }}>
                    {missionState.report.summaryCounts.passCount} PASS
                  </div>
                  <div style={{ background: 'var(--status-warn-subtle)', padding: '0.3rem', borderRadius: 'var(--radius-xs)', color: 'var(--status-warn)', fontWeight: 700 }}>
                    {missionState.report.summaryCounts.warningCount} WARN
                  </div>
                  <div style={{ background: 'var(--status-fail-subtle)', padding: '0.3rem', borderRadius: 'var(--radius-xs)', color: 'var(--status-fail)', fontWeight: 700 }}>
                    {missionState.report.summaryCounts.failCount} FAIL
                  </div>
                  <div style={{ background: 'var(--status-unverified-subtle)', padding: '0.3rem', borderRadius: 'var(--radius-xs)', color: 'var(--status-unverified)', fontWeight: 700 }}>
                    {missionState.report.summaryCounts.unverifiableCount} UNV
                  </div>
                </div>

                {onNavigateToResults && (
                  <Button
                    size="sm"
                    variant="outline"
                    style={{ width: '100%' }}
                    onClick={onNavigateToResults}
                  >
                    Inspect Full Evidence Drawer & Matrix
                  </Button>
                )}
              </div>
            )}

            {/* Sanitized Stage Event Payload */}
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Sanitized Stage Telemetry Payload
              </span>
              <CodeViewer
                code={JSON.stringify(
                  {
                    stage: activeDiagnostic?.stage || selectedCheckpoint.stageTrigger[0],
                    checkpointId: selectedCheckpoint.id,
                    rule: selectedCheckpoint.technicalRule,
                    criteria: selectedCheckpoint.metricDetail,
                    diagnostic: activeDiagnostic || null
                  },
                  null,
                  2
                )}
                title="Checkpoint Event Record"
                maxHeight="130px"
              />
            </div>

            {/* Test Input Configuration */}
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>
                Evaluation Candidate Recommendations
              </span>
              <textarea
                value={rawAgentInput}
                onChange={(e) => setRawAgentInput(e.target.value)}
                disabled={isExecuting}
                rows={2}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface-0)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '0.4rem 0.55rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
};

export default Mission3DView;
