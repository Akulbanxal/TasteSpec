import {
  type EvaluationScenario,
  type ResolvedEntityEvidence,
  type CandidateEntityEvidence
} from '../../../shared/src/evaluationModel.js';

export interface ScenarioFixtureBundle {
  scenario: EvaluationScenario;
  sampleAgentOutputs: {
    validHighAffinity: string;
    lowAffinityOrContradiction: string;
    unresolvedEntity: string;
  };
  demoResolvedEntities: ResolvedEntityEvidence[];
  demoCandidates: CandidateEntityEvidence[];
}

export const DEMO_SCENARIO_FIXTURES: ScenarioFixtureBundle[] = [
  {
    scenario: {
      id: 'scen_brooklyn_indie_natural_wine',
      title: 'Brooklyn Neo-Psychedelia to Natural Wine',
      personaName: 'East Williamsburg Indie Audiophile',
      description: 'Tests if agent recommendations for nightlife/dining ground properly in indie psychedelic music tastes (Stereolab, Crumb).',
      seeds: [
        { name: 'Stereolab', domain: 'music', resolvedQlooId: 'ent_demo_stereolab' },
        { name: 'Crumb', domain: 'music', resolvedQlooId: 'ent_demo_crumb' }
      ],
      targetDomain: 'place',
      location: {
        city: 'New York',
        countryCode: 'US',
        neighborhood: 'Brooklyn'
      },
      constraints: {
        minEmpiricalAffinity: 0.65,
        forbiddenAttributes: ['commercial_sports_bar'],
        requiredAttributes: ['natural_wine'],
        targetCategoryUrn: 'urn:entity:place'
      }
    },
    sampleAgentOutputs: {
      validHighAffinity: JSON.stringify({
        recommendations: [
          { rawName: 'The Four Horsemen', domain: 'place', agentClaimedReasoning: 'Intimate dining with exceptional low-intervention wine curation.', agentClaimedAffinity: 0.88 },
          { rawName: 'Ten Bells', domain: 'place', agentClaimedReasoning: 'Cozy Lower East Side natural wine institution.', agentClaimedAffinity: 0.74 },
          { rawName: 'Divergent Natural Wine Bar', domain: 'place', agentClaimedReasoning: 'Experimental cellar outside top-K candidate set.' },
          { rawName: 'Hypothetical Secret Loft Bar', domain: 'place', agentClaimedReasoning: 'Underground indie music listening bar.' }
        ]
      }, null, 2),
      lowAffinityOrContradiction: JSON.stringify({
        recommendations: [
          { rawName: 'Dave & Busters', domain: 'place', agentClaimedReasoning: 'Casual venue with drinks and games.' }
        ]
      }, null, 2),
      unresolvedEntity: JSON.stringify({
        recommendations: [
          { rawName: 'Hypothetical Secret Loft Bar', domain: 'place', agentClaimedReasoning: 'Underground indie music listening bar.' }
        ]
      }, null, 2)
    },
    demoResolvedEntities: [
      {
        query: 'The Four Horsemen',
        isResolved: true,
        qlooId: 'ent_demo_4horsemen',
        canonicalName: 'The Four Horsemen',
        domain: 'place',
        tags: ['natural_wine', 'intimate_dining'],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'The Four Horsemen', type: 'place' },
          provenance: 'fixture',
          latencyMs: 15,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      },
      {
        query: 'Ten Bells',
        isResolved: true,
        qlooId: 'ent_demo_ten_bells',
        canonicalName: 'Ten Bells',
        domain: 'place',
        tags: ['natural_wine'],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'Ten Bells', type: 'place' },
          provenance: 'fixture',
          latencyMs: 12,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      },
      {
        query: 'Divergent Natural Wine Bar',
        isResolved: true,
        qlooId: 'ent_demo_skin_contact',
        canonicalName: 'Divergent Natural Wine Bar',
        domain: 'place',
        tags: ['natural_wine', 'wine_cellar'],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'Divergent Natural Wine Bar', type: 'place' },
          provenance: 'fixture',
          latencyMs: 18,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      },
      {
        query: 'Dave & Busters',
        isResolved: true,
        qlooId: 'ent_demo_dave_busters',
        canonicalName: 'Dave & Busters',
        domain: 'place',
        tags: ['commercial_sports_bar', 'arcade'],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'Dave & Busters', type: 'place' },
          provenance: 'fixture',
          latencyMs: 14,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      },
      {
        query: 'Hypothetical Secret Loft Bar',
        isResolved: false,
        tags: [],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'Hypothetical Secret Loft Bar', type: 'place' },
          provenance: 'fixture',
          latencyMs: 10,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      }
    ],
    demoCandidates: [
      {
        candidateId: 'ent_demo_4horsemen',
        name: 'The Four Horsemen',
        type: 'place',
        returnedScore: 0.88,
        scoreMetricName: 'affinity',
        evidenceSource: {
          endpoint: '/insights',
          parametersUsed: { 'signal.interests.entities': 'ent_demo_stereolab', 'filter.type': 'urn:entity:place' },
          provenance: 'fixture',
          latencyMs: 35,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      },
      {
        candidateId: 'ent_demo_ten_bells',
        name: 'Ten Bells',
        type: 'place',
        returnedScore: 0.74,
        scoreMetricName: 'affinity',
        evidenceSource: {
          endpoint: '/insights',
          parametersUsed: { 'signal.interests.entities': 'ent_demo_stereolab', 'filter.type': 'urn:entity:place' },
          provenance: 'fixture',
          latencyMs: 28,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      }
    ]
  },
  {
    scenario: {
      id: 'scen_kyoto_minimalism_literature',
      title: 'Kyoto Architectural Minimalism to Japanese Literature',
      personaName: 'Kyoto Design Aesthetician',
      description: 'Evaluates whether cultural agent recommending books for a fan of minimalist Japanese architecture respects literary correlations.',
      seeds: [
        { name: 'Kengo Kuma', domain: 'person', resolvedQlooId: 'ent_demo_kuma' },
        { name: 'Tadao Ando', domain: 'person', resolvedQlooId: 'ent_demo_ando' }
      ],
      targetDomain: 'book',
      constraints: {
        minEmpiricalAffinity: 0.60,
        forbiddenAttributes: ['commercial_thriller'],
        requiredAttributes: ['architecture', 'philosophy'],
        targetCategoryUrn: 'urn:entity:book'
      }
    },
    sampleAgentOutputs: {
      validHighAffinity: JSON.stringify({
        recommendations: [
          { rawName: 'In Praise of Shadows', domain: 'book', agentClaimedReasoning: 'Classic essay on Japanese aesthetics and spatial light.' }
        ]
      }, null, 2),
      lowAffinityOrContradiction: JSON.stringify({
        recommendations: [
          { rawName: 'Generic Pulp Fiction Thriller', domain: 'book', agentClaimedReasoning: 'Action-packed summer page turner.' }
        ]
      }, null, 2),
      unresolvedEntity: JSON.stringify({
        recommendations: [
          { rawName: 'Unpublished Minimalist Manifesto 2026', domain: 'book' }
        ]
      }, null, 2)
    },
    demoResolvedEntities: [
      {
        query: 'In Praise of Shadows',
        isResolved: true,
        qlooId: 'ent_demo_shadows',
        canonicalName: 'In Praise of Shadows',
        domain: 'book',
        tags: ['philosophy', 'aesthetics', 'architecture'],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'In Praise of Shadows', type: 'book' },
          provenance: 'fixture',
          latencyMs: 14,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      },
      {
        query: 'Generic Pulp Fiction Thriller',
        isResolved: true,
        qlooId: 'ent_demo_pulp',
        canonicalName: 'Generic Pulp Fiction Thriller',
        domain: 'book',
        tags: ['commercial_thriller'],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'Generic Pulp Fiction Thriller', type: 'book' },
          provenance: 'fixture',
          latencyMs: 11,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      },
      {
        query: 'Unpublished Minimalist Manifesto 2026',
        isResolved: false,
        tags: [],
        evidenceSource: {
          endpoint: '/search',
          parametersUsed: { query: 'Unpublished Minimalist Manifesto 2026', type: 'book' },
          provenance: 'fixture',
          latencyMs: 9,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      }
    ],
    demoCandidates: [
      {
        candidateId: 'ent_demo_shadows',
        name: 'In Praise of Shadows',
        type: 'book',
        returnedScore: 0.84,
        scoreMetricName: 'affinity',
        evidenceSource: {
          endpoint: '/insights',
          parametersUsed: { 'signal.interests.entities': 'ent_demo_kuma', 'filter.type': 'urn:entity:book' },
          provenance: 'fixture',
          latencyMs: 28,
          retrievedAt: '2026-10-18T00:00:00Z'
        }
      }
    ]
  }
];
