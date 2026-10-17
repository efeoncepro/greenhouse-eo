# Meta template fixture

Unmodified upstream `template.tpl` at commit `a575edb31aa447469b855c3006ed9991dad711cf`:
https://github.com/facebookincubator/ConversionsAPI-Tag-for-GoogleTagManager

SHA256: `4a6cc4e087789ac5d3e04acb4bd80d863a002fd0d4f7b523c1e342073caae057`.
Apache 2.0; upstream license preserved in `META_TEMPLATE_LICENSE.txt`.
Fixture owns the offline patch/tests, not live GTM state. Efeonce modifications are isolated in
`../meta-receipt-callback.js` and `../build-meta-receipt-template.ts`. The generated modified template
must retain this notice and the upstream license; it adds response metadata without another sender.
