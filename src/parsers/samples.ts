import sampleIndoEuropeanPhyloXml from './fixtures/sample-indo-european.phyloxml?raw'
import sampleJaponicPhyloXml from './fixtures/sample-japonic.phyloxml?raw'
import sampleSiniticPhyloXml from './fixtures/sample-sinitic.phyloxml?raw'
import sampleTurkicPhyloXml from './fixtures/sample-turkic.phyloxml?raw'
import sampleUralicPhyloXml from './fixtures/sample-uralic.phyloxml?raw'

export type SampleId =
  'indo-european' | 'uralic' | 'turkic' | 'sinitic' | 'japonic'

export interface SampleDefinition {
  id: SampleId
  fileName: string
  text: string
}

export const SAMPLES: readonly SampleDefinition[] = [
  {
    id: 'indo-european',
    fileName: 'sample-indo-european.phyloxml',
    text: sampleIndoEuropeanPhyloXml,
  },
  {
    id: 'uralic',
    fileName: 'sample-uralic.phyloxml',
    text: sampleUralicPhyloXml,
  },
  {
    id: 'turkic',
    fileName: 'sample-turkic.phyloxml',
    text: sampleTurkicPhyloXml,
  },
  {
    id: 'sinitic',
    fileName: 'sample-sinitic.phyloxml',
    text: sampleSiniticPhyloXml,
  },
  {
    id: 'japonic',
    fileName: 'sample-japonic.phyloxml',
    text: sampleJaponicPhyloXml,
  },
]
