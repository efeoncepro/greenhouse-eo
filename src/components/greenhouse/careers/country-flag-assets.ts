import arFlag from 'circle-flags/flags/ar.svg'
import boFlag from 'circle-flags/flags/bo.svg'
import brFlag from 'circle-flags/flags/br.svg'
import clFlag from 'circle-flags/flags/cl.svg'
import coFlag from 'circle-flags/flags/co.svg'
import crFlag from 'circle-flags/flags/cr.svg'
import doFlag from 'circle-flags/flags/do.svg'
import ecFlag from 'circle-flags/flags/ec.svg'
import esFlag from 'circle-flags/flags/es.svg'
import gtFlag from 'circle-flags/flags/gt.svg'
import hnFlag from 'circle-flags/flags/hn.svg'
import mxFlag from 'circle-flags/flags/mx.svg'
import niFlag from 'circle-flags/flags/ni.svg'
import paFlag from 'circle-flags/flags/pa.svg'
import peFlag from 'circle-flags/flags/pe.svg'
import pyFlag from 'circle-flags/flags/py.svg'
import svFlag from 'circle-flags/flags/sv.svg'
import usFlag from 'circle-flags/flags/us.svg'
import uyFlag from 'circle-flags/flags/uy.svg'
import veFlag from 'circle-flags/flags/ve.svg'

const COUNTRY_FLAG_ASSETS = {
  AR: arFlag,
  BO: boFlag,
  BR: brFlag,
  CL: clFlag,
  CO: coFlag,
  CR: crFlag,
  DO: doFlag,
  EC: ecFlag,
  ES: esFlag,
  GT: gtFlag,
  HN: hnFlag,
  MX: mxFlag,
  NI: niFlag,
  PA: paFlag,
  PE: peFlag,
  PY: pyFlag,
  SV: svFlag,
  US: usFlag,
  UY: uyFlag,
  VE: veFlag
} as const

export const getCandidateCountryFlagAsset = (code: string) =>
  COUNTRY_FLAG_ASSETS[code.toUpperCase() as keyof typeof COUNTRY_FLAG_ASSETS] ?? null
