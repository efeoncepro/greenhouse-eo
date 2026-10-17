"""Extract enum data from the official SDK with ast; never import/execute SDK code."""
import argparse
import ast
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

VERSION = '25.0.0'
BASE = f'https://raw.githubusercontent.com/facebook/facebook-python-business-sdk/{VERSION}/facebook_business/adobjects/'
FILES = ['adsinsights', 'adspixel', 'adspixelstatsresult', 'iguser', 'igmedia', 'instagraminsightsresult', 'page', 'insightsresult']


def enum(tree, class_name):
    owner = next(n for n in tree.body if isinstance(n, ast.ClassDef))
    member = next(n for n in owner.body if isinstance(n, ast.ClassDef) and n.name == class_name)
    return sorted(set(n.value.value for n in member.body if isinstance(n, ast.Assign)
                      and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-dir', type=Path)
    args = parser.parse_args()
    trees, sources = {}, []
    for name in FILES:
        url = BASE + name + '.py'
        raw = (args.source_dir / (name + '.py')).read_bytes() if args.source_dir else urlopen(url, timeout=30).read()
        trees[name] = ast.parse(raw)
        sources.append({'file': name + '.py', 'url': url, 'sha256': hashlib.sha256(raw).hexdigest()})
    ads = trees['adsinsights']
    social = trees['instagraminsightsresult']
    data = {
        'catalogVersion': 'meta-metrics-catalog.v1', 'apiVersion': 'v25.0',
        'provenance': {'sdk': 'facebook/facebook-python-business-sdk', 'version': VERSION,
                       'extraction': 'python ast string constants only; no SDK execution',
                       'license': f'https://github.com/facebook/facebook-python-business-sdk/blob/{VERSION}/LICENSE',
                       'sources': sources},
        'availability': 'Selectable SDK catalog, not a guarantee of support, permission, scope, compatibility or data. Provider errors remain explicit.',
        'ads': {'fields': enum(ads, 'Field'), 'breakdowns': enum(ads, 'Breakdowns'),
                'actionBreakdowns': enum(ads, 'ActionBreakdowns'),
                'attributionWindows': enum(ads, 'ActionAttributionWindows'),
                'actionReportTimes': enum(ads, 'ActionReportTime'), 'levels': enum(ads, 'Level')},
        'pixel': {'aggregations': enum(trees['adspixelstatsresult'], 'Aggregation'),
                  'events': 'Provider-resolved aggregate event names; all when event filter omitted. No raw event payloads or individual PII.'},
        'dataset': {'command': 'events quality', 'metrics': ['event_match_quality', 'event_coverage', 'dedupe_key_feedback', 'data_freshness'],
                    'availability': 'Provider-resolved per event; missing is unavailable, never zero.'},
        'page': {'metrics': None, 'catalogMode': 'provider_resolved', 'metricSyntax': '^[a-z][a-z0-9_]{0,119}$',
                 'periods': enum(trees['insightsresult'], 'Period'),
                 'reason': 'Page.get_insights metric is list<Object>; the SDK has no metric-name enum.'},
        'instagram': {'metrics': enum(social, 'Metric'), 'periods': enum(social, 'Period'),
                      'breakdowns': enum(social, 'Breakdown'), 'metricTypes': enum(social, 'MetricType'),
                      'timeframes': enum(social, 'Timeframe')},
        'instagram-media': {'metrics': enum(social, 'Metric'), 'periods': enum(social, 'Period'),
                            'breakdowns': enum(social, 'Breakdown'),
                            'ownership': 'Verify media belongs to the profile Instagram before querying insights.'},
    }
    target = Path(__file__).with_name('metrics-catalog.json')
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'path': str(target), 'adsFields': len(data['ads']['fields']), 'pixelAggregations': len(data['pixel']['aggregations']), 'instagramMetrics': len(data['instagram']['metrics'])}))


if __name__ == '__main__':
    main()
