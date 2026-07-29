/* @ds-bundle: {"format":3,"namespace":"AXISEfeonceGreenhouseDesignSystem_9781a6","components":[{"name":"Button","sourcePath":"components/buttons/Button.jsx"},{"name":"IconButton","sourcePath":"components/buttons/IconButton.jsx"},{"name":"KpiCard","sourcePath":"components/data/KpiCard.jsx"},{"name":"StatusChip","sourcePath":"components/data/StatusChip.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"}],"sourceHashes":{"components/buttons/Button.jsx":"593d45f7b385","components/buttons/IconButton.jsx":"0e2fb609813a","components/data/KpiCard.jsx":"1df1bdab7768","components/data/StatusChip.jsx":"450d8034a8d6","components/feedback/Alert.jsx":"2e363fcbfbaa","components/forms/Input.jsx":"f4ee836fe12c","components/forms/Select.jsx":"d4cc9e1f01b8","components/surfaces/Card.jsx":"6697068cf325","ui_kits/greenhouse/AppShell.jsx":"01bb6cbc72ce","ui_kits/greenhouse/DashboardScreen.jsx":"d49f7f15c66c","ui_kits/greenhouse/FinanceScreen.jsx":"c96accd4e309","ui_kits/greenhouse/LoginScreen.jsx":"7c0cf328cd6c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.AXISEfeonceGreenhouseDesignSystem_9781a6 = window.AXISEfeonceGreenhouseDesignSystem_9781a6 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/buttons/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS Button — the canonical Greenhouse action.
 * Sentence case only, never all caps. One primary action per local context.
 */
function Button({
  children,
  variant = 'primary',
  // primary | secondary | tonal | outlined | ghost | danger
  size = 'md',
  // sm | md | lg
  disabled = false,
  fullWidth = false,
  startIcon,
  // Tabler class string e.g. "ti ti-plus", or node
  endIcon,
  type = 'button',
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: {
      padding: '6px 12px',
      fontSize: 'var(--type-body-md-size)',
      height: 32,
      gap: 6,
      icon: 16
    },
    md: {
      padding: '8px 16px',
      fontSize: 'var(--type-label-md-size)',
      height: 40,
      gap: 8,
      icon: 18
    },
    lg: {
      padding: '11px 20px',
      fontSize: 'var(--type-label-lg-size)',
      height: 46,
      gap: 8,
      icon: 20
    }
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary: {
      background: 'var(--primary)',
      color: 'var(--on-primary)',
      border: '1px solid transparent',
      '--hover': 'var(--primary-dark)'
    },
    secondary: {
      background: 'var(--secondary)',
      color: 'var(--on-secondary)',
      border: '1px solid transparent',
      '--hover': 'var(--secondary-dark)'
    },
    tonal: {
      background: 'var(--primary-tonal)',
      color: 'var(--primary-dark)',
      border: '1px solid transparent',
      '--hover': '#c5ddf4'
    },
    outlined: {
      background: 'transparent',
      color: 'var(--primary)',
      border: '1px solid var(--primary)',
      '--hover': 'var(--primary-tonal)'
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      '--hover': 'var(--surface-alt)'
    },
    danger: {
      background: 'var(--error)',
      color: 'var(--on-error)',
      border: '1px solid transparent',
      '--hover': 'var(--error-ink)'
    }
  };
  const v = variants[variant] || variants.primary;
  const [hover, setHover] = React.useState(false);
  const renderIcon = icon => typeof icon === 'string' ? /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: s.icon,
      lineHeight: 0
    },
    "aria-hidden": "true"
  }) : icon;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: s.fontSize,
      lineHeight: 1,
      letterSpacing: 0,
      padding: s.padding,
      minHeight: s.height,
      width: fullWidth ? '100%' : 'auto',
      borderRadius: 'var(--radius-md)',
      background: disabled ? 'var(--surface-alt)' : hover ? v['--hover'] : v.background,
      color: disabled ? 'var(--text-disabled)' : v.color,
      border: disabled ? '1px solid var(--border-subtle)' : v.border,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--motion-short) var(--ease-standard), box-shadow var(--motion-short) var(--ease-standard)',
      boxShadow: hover && !disabled && (variant === 'primary' || variant === 'secondary') ? 'var(--elevation-raised)' : 'none',
      outline: 'none',
      whiteSpace: 'nowrap',
      userSelect: 'none',
      ...style
    }
  }, rest), startIcon && renderIcon(startIcon), children, endIcon && renderIcon(endIcon));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/Button.jsx", error: String((e && e.message) || e) }); }

// components/buttons/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS IconButton — a square, icon-only control for toolbars, table rows, headers.
 * Always pass an accessible label.
 */
function IconButton({
  icon,
  // Tabler class string e.g. "ti ti-dots-vertical" (required)
  label,
  // accessible name (required)
  variant = 'ghost',
  // ghost | tonal | outlined | filled
  size = 'md',
  // sm | md | lg
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: 30,
    md: 38,
    lg: 44
  };
  const iconSizes = {
    sm: 16,
    md: 18,
    lg: 20
  };
  const dim = sizes[size] || sizes.md;
  const variants = {
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
      hover: 'var(--surface-alt)'
    },
    tonal: {
      background: 'var(--primary-tonal)',
      color: 'var(--primary-dark)',
      border: '1px solid transparent',
      hover: '#c5ddf4'
    },
    outlined: {
      background: 'var(--surface)',
      color: 'var(--text-secondary)',
      border: '1px solid var(--border-subtle)',
      hover: 'var(--surface-alt)'
    },
    filled: {
      background: 'var(--primary)',
      color: 'var(--on-primary)',
      border: '1px solid transparent',
      hover: 'var(--primary-dark)'
    }
  };
  const v = variants[variant] || variants.ghost;
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: dim,
      height: dim,
      borderRadius: 'var(--radius-md)',
      background: disabled ? 'transparent' : hover ? v.hover : v.background,
      color: disabled ? 'var(--text-disabled)' : v.color,
      border: v.border,
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--motion-short) var(--ease-standard)',
      outline: 'none',
      padding: 0,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: iconSizes[size],
      lineHeight: 0
    },
    "aria-hidden": "true"
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/buttons/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/KpiCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS KpiCard — an executive metric with context. Never show a number without
 * a comparison (UX_WRITING §10). Value is the largest element; trend is signed.
 */
function KpiCard({
  label,
  // metric name (short, noun-based)
  value,
  // formatted value string
  period,
  // e.g. "Este mes"
  delta,
  // e.g. "+12%" — sign drives direction + color
  deltaContext,
  // e.g. "vs. mes anterior"
  icon,
  // optional Tabler class for the corner glyph
  accent = 'primary',
  // primary | secondary | info — corner glyph tint
  style,
  ...rest
}) {
  const dir = typeof delta === 'string' && delta.trim().startsWith('-') ? 'down' : typeof delta === 'string' && delta.trim().startsWith('+') ? 'up' : 'flat';
  const deltaColor = dir === 'up' ? 'var(--chart-positive)' : dir === 'down' ? 'var(--chart-negative)' : 'var(--text-secondary)';
  const deltaIcon = dir === 'up' ? 'ti ti-trending-up' : dir === 'down' ? 'ti ti-trending-down' : 'ti ti-minus';
  const accentMap = {
    primary: 'var(--primary)',
    secondary: 'var(--secondary)',
    info: 'var(--info)'
  };
  const accentTonal = {
    primary: 'var(--primary-tonal)',
    secondary: '#e7f3d4',
    info: 'var(--info-tonal)'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      position: 'relative',
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-lg)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      minWidth: 200,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-sm-size)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-secondary)',
      letterSpacing: '.01em'
    }
  }, label), icon && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--radius-md)',
      background: accentTonal[accent],
      color: accentMap[accent],
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: 18,
      lineHeight: 0
    },
    "aria-hidden": "true"
  }))), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: '"tnum" 1',
      fontSize: 'var(--type-kpi-size)',
      fontWeight: 'var(--fw-extrabold)',
      lineHeight: 1.05,
      color: 'var(--text-primary)'
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, delta && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      color: deltaColor,
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: '"tnum" 1',
      fontSize: 'var(--type-body-sm-size)',
      fontWeight: 'var(--fw-bold)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: deltaIcon,
    style: {
      fontSize: 15,
      lineHeight: 0
    },
    "aria-hidden": "true"
  }), delta), (deltaContext || period) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-disabled)'
    }
  }, deltaContext || period)));
}
Object.assign(__ds_scope, { KpiCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/KpiCard.jsx", error: String((e && e.message) || e) }); }

// components/data/StatusChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS StatusChip — small, readable, semantically colored metadata.
 * Tonal by default (soft surface + AA ink). Never a miniature banner.
 */
function StatusChip({
  children,
  status = 'neutral',
  // neutral | success | warning | error | info | primary | secondary
  variant = 'tonal',
  // tonal | solid | outlined
  icon,
  // optional Tabler class e.g. "ti ti-circle-check"
  dot = false,
  // show a leading status dot instead of an icon
  size = 'md',
  // sm | md
  style,
  ...rest
}) {
  const palette = {
    neutral: {
      tonal: ['var(--surface-alt)', 'var(--text-secondary)'],
      solid: ['var(--text-secondary)', '#fff'],
      dot: 'var(--text-disabled)'
    },
    success: {
      tonal: ['var(--success-tonal)', 'var(--success-ink)'],
      solid: ['var(--success)', 'var(--on-success)'],
      dot: 'var(--success)'
    },
    warning: {
      tonal: ['var(--warning-tonal)', 'var(--warning-ink)'],
      solid: ['var(--warning)', 'var(--on-warning)'],
      dot: 'var(--warning)'
    },
    error: {
      tonal: ['var(--error-tonal)', 'var(--error-ink)'],
      solid: ['var(--error)', 'var(--on-error)'],
      dot: 'var(--error)'
    },
    info: {
      tonal: ['var(--info-tonal)', 'var(--info-ink)'],
      solid: ['var(--info)', 'var(--on-info)'],
      dot: 'var(--info)'
    },
    primary: {
      tonal: ['var(--primary-tonal)', 'var(--primary-dark)'],
      solid: ['var(--primary)', 'var(--on-primary)'],
      dot: 'var(--primary)'
    },
    secondary: {
      tonal: ['#e7f3d4', 'var(--secondary-dark)'],
      solid: ['var(--secondary)', 'var(--on-secondary)'],
      dot: 'var(--secondary)'
    }
  };
  const p = palette[status] || palette.neutral;
  const sz = size === 'sm' ? {
    padding: '2px 8px',
    fontSize: '0.75rem',
    icon: 13,
    gap: 5
  } : {
    padding: '4px 10px',
    fontSize: 'var(--type-body-md-size)',
    icon: 15,
    gap: 6
  };
  let bg,
    fg,
    border = '1px solid transparent';
  if (variant === 'solid') {
    [bg, fg] = p.solid;
  } else if (variant === 'outlined') {
    bg = 'transparent';
    fg = p.tonal[1];
    border = `1px solid ${p.dot}`;
  } else {
    [bg, fg] = p.tonal;
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: sz.gap,
      fontFamily: 'var(--font-sans)',
      fontWeight: 'var(--fw-semibold)',
      fontSize: sz.fontSize,
      lineHeight: 1.4,
      padding: sz.padding,
      borderRadius: 'var(--radius-md)',
      background: bg,
      color: fg,
      border,
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: p.dot,
      flex: '0 0 auto'
    }
  }), icon && /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: sz.icon,
      lineHeight: 0
    },
    "aria-hidden": "true"
  }), children);
}
Object.assign(__ds_scope, { StatusChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatusChip.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS Alert — page/section-level feedback banner. Tonal surface + AA ink + soft
 * hairline. Communicates [what happened] + [how to fix], with an optional action.
 */
function Alert({
  children,
  severity = 'info',
  // info | success | warning | error
  title,
  onClose,
  // if provided, shows a dismiss button
  action,
  // optional node (e.g. a Button)
  icon,
  // override the default Tabler icon
  style,
  ...rest
}) {
  const map = {
    info: {
      surface: 'var(--info-tonal)',
      ink: 'var(--info-ink)',
      border: '#bcd8f6',
      icon: 'ti ti-info-circle'
    },
    success: {
      surface: 'var(--success-tonal)',
      ink: 'var(--success-ink)',
      border: '#bce3cd',
      icon: 'ti ti-circle-check'
    },
    warning: {
      surface: 'var(--warning-tonal)',
      ink: 'var(--warning-ink)',
      border: '#f4e2ad',
      icon: 'ti ti-alert-triangle'
    },
    error: {
      surface: 'var(--error-tonal)',
      ink: 'var(--error-ink)',
      border: '#f3c2c5',
      icon: 'ti ti-alert-octagon'
    }
  };
  const s = map[severity] || map.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "alert",
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      background: s.surface,
      border: `1px solid ${s.border}`,
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
      fontFamily: 'var(--font-sans)',
      color: s.ink,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("i", {
    className: icon || s.icon,
    style: {
      fontSize: 19,
      lineHeight: 0,
      marginTop: 1,
      flex: '0 0 auto'
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: 3
    }
  }, title && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-label-md-size)',
      fontWeight: 'var(--fw-semibold)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-md-size)',
      lineHeight: 1.5,
      color: 'var(--text-primary)'
    }
  }, children), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, action)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: s.ink,
      padding: 2,
      lineHeight: 0,
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-x",
    style: {
      fontSize: 17
    },
    "aria-hidden": "true"
  })));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS Input — quiet, readable text field. Label ABOVE the field, helper text
 * below and always visible. Never use the placeholder as the label.
 */
function Input({
  label,
  value,
  onChange,
  placeholder,
  // FORMAT example only, e.g. "nombre@empresa.com"
  helper,
  // persistent helper text
  error,
  // error message — replaces helper, turns field red
  type = 'text',
  required = false,
  disabled = false,
  startIcon,
  // Tabler class string
  id,
  style,
  ...rest
}) {
  const reactId = React.useId();
  const fieldId = id || reactId;
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? 'var(--error)' : focus ? 'var(--primary)' : 'var(--border-subtle)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: 'var(--type-label-md-size)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--error)',
      marginLeft: 2
    }
  }, "*")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: disabled ? 'var(--surface-alt)' : 'var(--surface)',
      border: `1px solid ${borderColor}`,
      borderRadius: 'var(--radius-md)',
      padding: '0 12px',
      height: 40,
      boxShadow: focus && !error ? '0 0 0 3px rgba(3,117,219,.14)' : error && focus ? '0 0 0 3px rgba(220,46,57,.14)' : 'none',
      transition: 'border-color var(--motion-short) var(--ease-standard), box-shadow var(--motion-short) var(--ease-standard)'
    }
  }, startIcon && /*#__PURE__*/React.createElement("i", {
    className: startIcon,
    style: {
      fontSize: 17,
      color: 'var(--text-disabled)',
      lineHeight: 0
    },
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    required: required,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      color: 'var(--text-primary)',
      height: '100%',
      minWidth: 0
    }
  }, rest))), (error || helper) && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      fontSize: 'var(--type-body-sm-size)',
      color: error ? 'var(--error-ink)' : 'var(--text-secondary)'
    }
  }, error && /*#__PURE__*/React.createElement("i", {
    className: "ti ti-alert-circle",
    style: {
      fontSize: 14,
      lineHeight: 0
    },
    "aria-hidden": "true"
  }), error || helper));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS Select — native dropdown styled to match Input. Label above; quiet field.
 */
function Select({
  label,
  value,
  onChange,
  options = [],
  // [{value, label}] or string[]
  placeholder,
  // optional disabled first option
  helper,
  error,
  required = false,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const reactId = React.useId();
  const fieldId = id || reactId;
  const [focus, setFocus] = React.useState(false);
  const borderColor = error ? 'var(--error)' : focus ? 'var(--primary)' : 'var(--border-subtle)';
  const norm = options.map(o => typeof o === 'string' ? {
    value: o,
    label: o
  } : o);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      fontFamily: 'var(--font-sans)',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fieldId,
    style: {
      fontSize: 'var(--type-label-md-size)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, label, required && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--error)',
      marginLeft: 2
    }
  }, "*")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fieldId,
    value: value,
    onChange: onChange,
    disabled: disabled,
    required: required,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: 'none',
      WebkitAppearance: 'none',
      width: '100%',
      height: 40,
      padding: '0 38px 0 12px',
      borderRadius: 'var(--radius-md)',
      border: `1px solid ${borderColor}`,
      background: disabled ? 'var(--surface-alt)' : 'var(--surface)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      color: value ? 'var(--text-primary)' : 'var(--text-disabled)',
      outline: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: focus && !error ? '0 0 0 3px rgba(3,117,219,.14)' : 'none',
      transition: 'border-color var(--motion-short) var(--ease-standard), box-shadow var(--motion-short) var(--ease-standard)'
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), norm.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))), /*#__PURE__*/React.createElement("i", {
    className: "ti ti-chevron-down",
    style: {
      position: 'absolute',
      right: 12,
      fontSize: 17,
      color: 'var(--text-secondary)',
      pointerEvents: 'none',
      lineHeight: 0
    },
    "aria-hidden": "true"
  })), (error || helper) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: error ? 'var(--error-ink)' : 'var(--text-secondary)'
    }
  }, error || helper));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AXIS Card — the baseline surface for forms, dashboards, and operational panels.
 * Flat + 1px hairline by default; depth is restrained and semantic.
 */
function Card({
  children,
  title,
  // optional section header
  subtitle,
  action,
  // optional node rendered top-right (e.g. IconButton)
  elevation = 'none',
  // none | raised | floating
  padding = 'lg',
  // sm | md | lg | none
  style,
  bodyStyle,
  ...rest
}) {
  const pads = {
    none: 0,
    sm: 'var(--space-md)',
    md: 'var(--space-md)',
    lg: 'var(--space-lg)'
  };
  const pad = pads[padding] ?? pads.lg;
  const shadow = {
    none: 'none',
    raised: 'var(--elevation-raised)',
    floating: 'var(--elevation-floating)'
  }[elevation];
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      boxShadow: shadow,
      fontFamily: 'var(--font-sans)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
      ...style
    }
  }, rest), (title || action) && /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      padding: `var(--space-md) ${typeof pad === 'string' ? pad : pad + 'px'}`,
      borderBottom: '1px solid var(--surface-alt)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, title && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-section-title-size)',
      fontWeight: 'var(--fw-semibold)',
      color: 'var(--text-primary)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, subtitle)), action), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: pad,
      ...bodyStyle
    }
  }, children));
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greenhouse/AppShell.jsx
try { (() => {
// Greenhouse AppShell — light sidebar + topbar chrome (Vuexy-derived).
// Exposes window.GH_AppShell. Composes nothing from the bundle directly; screens do.
const {
  useState
} = React;
const NAV = [{
  section: null,
  items: [{
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'ti ti-layout-dashboard'
  }, {
    id: 'proyectos',
    label: 'Proyectos',
    icon: 'ti ti-folders'
  }, {
    id: 'sprints',
    label: 'Sprints',
    icon: 'ti ti-run'
  }]
}, {
  section: 'Operación',
  items: [{
    id: 'people',
    label: 'People',
    icon: 'ti ti-users'
  }, {
    id: 'payroll',
    label: 'HR · Nómina',
    icon: 'ti ti-receipt-2'
  }, {
    id: 'finance',
    label: 'Finanzas',
    icon: 'ti ti-coins',
    badge: '3'
  }]
}, {
  section: 'Agencia',
  items: [{
    id: 'spaces',
    label: 'Espacios',
    icon: 'ti ti-building-community'
  }, {
    id: 'capacity',
    label: 'Capacidad',
    icon: 'ti ti-gauge'
  }]
}];
function NavItem({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = useState(false);
  const on = active;
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      textAlign: 'left',
      padding: '9px 12px',
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-label-md-size)',
      fontWeight: 'var(--fw-semibold)',
      background: on ? 'var(--primary)' : hover ? 'var(--surface-alt)' : 'transparent',
      color: on ? 'var(--on-primary)' : 'var(--text-secondary)',
      boxShadow: on ? 'var(--elevation-raised)' : 'none',
      transition: 'background var(--motion-short) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: item.icon,
    style: {
      fontSize: 19,
      lineHeight: 0
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontSize: 11,
      fontWeight: 700,
      minWidth: 18,
      height: 18,
      padding: '0 5px',
      borderRadius: 9999,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: on ? 'rgba(255,255,255,.25)' : 'var(--error)',
      color: '#fff'
    }
  }, item.badge));
}
function GH_AppShell({
  active = 'dashboard',
  onNavigate,
  onLogout,
  pageTitle,
  breadcrumb,
  children,
  headerAction
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      background: 'var(--neutral)',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 256,
      flex: '0 0 256px',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 14px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '0 8px 18px'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/greenhouse-full.svg",
    alt: "Greenhouse",
    style: {
      height: 26
    }
  })), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      overflowY: 'auto',
      flex: 1
    }
  }, NAV.map((grp, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      marginTop: grp.section ? 14 : 0
    }
  }, grp.section && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-overline-size)',
      fontWeight: 600,
      letterSpacing: '.08em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      padding: '0 12px 6px'
    }
  }, grp.section), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, grp.items.map(it => /*#__PURE__*/React.createElement(NavItem, {
    key: it.id,
    item: it,
    active: active === it.id,
    onClick: () => onNavigate && onNavigate(it.id)
  })))))), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 12px',
      marginTop: 8,
      borderRadius: 'var(--radius-md)',
      border: 'none',
      cursor: 'pointer',
      background: 'transparent',
      color: 'var(--text-secondary)',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-label-md-size)',
      fontWeight: 'var(--fw-semibold)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-logout",
    style: {
      fontSize: 19,
      lineHeight: 0
    }
  }), " Cerrar sesi\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("header", {
    style: {
      height: 64,
      flex: '0 0 64px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '0 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      maxWidth: 380,
      height: 38,
      background: 'var(--neutral)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      padding: '0 12px'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-search",
    style: {
      fontSize: 17,
      color: 'var(--text-disabled)'
    }
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar espacios, personas, facturas\u2026",
    style: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-md-size)',
      color: 'var(--text-primary)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    style: {
      position: 'relative',
      width: 38,
      height: 38,
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)',
      background: 'var(--surface)',
      cursor: 'pointer',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "ti ti-bell",
    style: {
      fontSize: 18
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      top: 7,
      right: 8,
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: 'var(--error)',
      border: '1.5px solid var(--surface)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      paddingLeft: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'var(--primary)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 14
    }
  }, "JR"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      lineHeight: 1.25
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-label-md-size)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, "Julio Reyes"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, "Admin \xB7 Efeonce")))), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '24px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, breadcrumb && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, breadcrumb.map((b, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, i > 0 && /*#__PURE__*/React.createElement("i", {
    className: "ti ti-chevron-right",
    style: {
      fontSize: 13,
      color: 'var(--text-disabled)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: i === breadcrumb.length - 1 ? 'var(--text-primary)' : 'var(--text-secondary)'
    }
  }, b)))), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-surface-hero-size)',
      fontWeight: 600,
      lineHeight: 1.15,
      color: 'var(--text-primary)'
    }
  }, pageTitle)), headerAction), children)));
}
window.GH_AppShell = GH_AppShell;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greenhouse/AppShell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greenhouse/DashboardScreen.jsx
try { (() => {
// Greenhouse Dashboard — executive client view. Composes AXIS primitives.
const {
  KpiCard,
  Card,
  StatusChip,
  Button,
  IconButton
} = window.AXISEfeonceGreenhouseDesignSystem_9781a6;

// Lightweight cashflow chart (data viz — tokens, not hand-drawn icons)
function CashflowChart() {
  const income = [42, 48, 45, 55, 60, 58, 66, 72, 68, 75, 80, 84];
  const expense = [30, 34, 33, 38, 41, 40, 44, 47, 46, 49, 52, 54];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const W = 560,
    H = 180,
    max = 90,
    pad = 8;
  const x = i => pad + i * (W - pad * 2) / (income.length - 1);
  const y = v => H - v / max * H;
  const line = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = arr => `${line(arr)} L${x(arr.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${W} ${H + 22}`,
    style: {
      width: '100%',
      height: 'auto',
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: "ghInc",
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: "var(--chart-positive)",
    stopOpacity: "0.22"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: "var(--chart-positive)",
    stopOpacity: "0"
  }))), [0, 0.5, 1].map(g => /*#__PURE__*/React.createElement("line", {
    key: g,
    x1: "0",
    x2: W,
    y1: H - g * H,
    y2: H - g * H,
    stroke: "var(--surface-alt)",
    strokeWidth: "1"
  })), /*#__PURE__*/React.createElement("path", {
    d: area(income),
    fill: "url(#ghInc)"
  }), /*#__PURE__*/React.createElement("path", {
    d: line(income),
    fill: "none",
    stroke: "var(--chart-positive)",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: line(expense),
    fill: "none",
    stroke: "var(--chart-neutral)",
    strokeWidth: "2",
    strokeDasharray: "4 4",
    strokeLinecap: "round"
  }), months.map((m, i) => /*#__PURE__*/React.createElement("text", {
    key: m,
    x: x(i),
    y: H + 16,
    fontSize: "10",
    fontFamily: "var(--font-sans)",
    fill: "var(--text-disabled)",
    textAnchor: "middle"
  }, m))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 18,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement(Legend, {
    color: "var(--chart-positive)",
    label: "Ingresos"
  }), /*#__PURE__*/React.createElement(Legend, {
    color: "var(--chart-neutral)",
    label: "Egresos",
    dashed: true
  })));
}
function Legend({
  color,
  label,
  dashed
}) {
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 7,
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 0,
      borderTop: `${dashed ? '2px dashed' : '2.5px solid'} ${color}`
    }
  }), " ", label);
}
const PROJECTS = [{
  id: 'EO-0471',
  name: 'Rediseño portal Bresler',
  client: 'Bresler',
  status: ['success', 'En track'],
  progress: 82,
  owner: 'MJ'
}, {
  id: 'EO-0468',
  name: 'Integración Notion ops',
  client: 'Acme Corp',
  status: ['warning', 'Atención'],
  progress: 54,
  owner: 'CM'
}, {
  id: 'EO-0455',
  name: 'Migración finanzas Q2',
  client: 'Zurita SpA',
  status: ['error', 'En riesgo'],
  progress: 31,
  owner: 'PL'
}, {
  id: 'EO-0449',
  name: 'Onboarding capacidad',
  client: 'Felipe Z.',
  status: ['info', 'En revisión'],
  progress: 67,
  owner: 'AR'
}];
function GH_Dashboard() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(KpiCard, {
    label: "Ingresos (mes actual)",
    value: "$ 84.2M",
    delta: "+12%",
    deltaContext: "vs. mes anterior",
    icon: "ti ti-cash",
    accent: "primary"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Espacios activos",
    value: "18",
    delta: "+2",
    deltaContext: "vs. mes anterior",
    icon: "ti ti-building-community",
    accent: "secondary"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Entrega a tiempo",
    value: "72%",
    delta: "-8%",
    deltaContext: "vs. meta 85%",
    icon: "ti ti-clock-check",
    accent: "info"
  }), /*#__PURE__*/React.createElement(KpiCard, {
    label: "Capacidad usada",
    value: "82%",
    delta: "+4%",
    deltaContext: "vs. mes anterior",
    icon: "ti ti-gauge",
    accent: "primary"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      gap: 16,
      alignItems: 'start'
    }
  }, /*#__PURE__*/React.createElement(Card, {
    title: "Flujo de caja",
    subtitle: "Ingresos vs. egresos \xB7 2026",
    action: /*#__PURE__*/React.createElement(IconButton, {
      icon: "ti ti-dots-vertical",
      label: "Opciones"
    })
  }, /*#__PURE__*/React.createElement(CashflowChart, null)), /*#__PURE__*/React.createElement(Card, {
    title: "Riesgos abiertos",
    subtitle: "Requieren atenci\xF3n",
    action: /*#__PURE__*/React.createElement(StatusChip, {
      status: "error",
      variant: "solid",
      size: "sm"
    }, "3")
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Risk, {
    icon: "ti ti-alert-triangle",
    tone: "var(--error-ink)",
    bg: "var(--error-tonal)",
    title: "Migraci\xF3n finanzas Q2",
    body: "31% completado \xB7 5 d\xEDas tras la fecha l\xEDmite."
  }), /*#__PURE__*/React.createElement(Risk, {
    icon: "ti ti-clock-exclamation",
    tone: "var(--warning-ink)",
    bg: "var(--warning-tonal)",
    title: "Integraci\xF3n Notion ops",
    body: "Entrega a tiempo cay\xF3 a 54%."
  }), /*#__PURE__*/React.createElement(Risk, {
    icon: "ti ti-users",
    tone: "var(--info-ink)",
    bg: "var(--info-tonal)",
    title: "Capacidad del equipo",
    body: "3 miembros sin proyecto el pr\xF3ximo ciclo."
  })))), /*#__PURE__*/React.createElement(Card, {
    title: "Proyectos recientes",
    subtitle: "4 de 31 activos",
    padding: "none",
    action: /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "tonal",
      endIcon: "ti ti-arrow-right"
    }, "Ver todos")
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      textAlign: 'left'
    }
  }, ['Proyecto', 'Cliente', 'Estado', 'Avance', 'Responsable'].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: '11px 24px',
      fontSize: 'var(--type-overline-size)',
      fontWeight: 600,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      borderBottom: '1px solid var(--border-subtle)',
      textAlign: i === 3 ? 'left' : 'left'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, PROJECTS.map(p => /*#__PURE__*/React.createElement("tr", {
    key: p.id
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 24px',
      borderBottom: '1px solid var(--surface-alt)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-md-size)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, p.name), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-disabled)'
    }
  }, p.id))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 24px',
      borderBottom: '1px solid var(--surface-alt)',
      fontSize: 'var(--type-body-md-size)',
      color: 'var(--text-secondary)'
    }
  }, p.client), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 24px',
      borderBottom: '1px solid var(--surface-alt)'
    }
  }, /*#__PURE__*/React.createElement(StatusChip, {
    status: p.status[0],
    dot: true,
    size: "sm"
  }, p.status[1])), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 24px',
      borderBottom: '1px solid var(--surface-alt)',
      minWidth: 140
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 6,
      background: 'var(--surface-alt)',
      borderRadius: 9999,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: `${p.progress}%`,
      height: '100%',
      background: p.progress < 40 ? 'var(--chart-negative)' : p.progress < 70 ? 'var(--chart-caution)' : 'var(--chart-positive)',
      borderRadius: 9999
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontSize: 'var(--type-body-sm-size)',
      fontWeight: 600,
      color: 'var(--text-secondary)',
      width: 32,
      textAlign: 'right'
    }
  }, p.progress, "%"))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 24px',
      borderBottom: '1px solid var(--surface-alt)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 30,
      height: 30,
      borderRadius: '50%',
      background: 'var(--secondary)',
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 12,
      fontWeight: 700
    }
  }, p.owner))))))));
}
function Risk({
  icon,
  tone,
  bg,
  title,
  body
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 11,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 'var(--radius-md)',
      background: bg,
      color: tone,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: '0 0 auto'
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: icon,
    style: {
      fontSize: 17
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-md-size)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)',
      lineHeight: 1.45
    }
  }, body)));
}
window.GH_Dashboard = GH_Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greenhouse/DashboardScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greenhouse/FinanceScreen.jsx
try { (() => {
// Greenhouse Finance — income ledger (dense operational table).
const {
  Card,
  StatusChip,
  Button,
  IconButton,
  Input
} = window.AXISEfeonceGreenhouseDesignSystem_9781a6;
const ROWS = [{
  id: 'INC-2026-0471',
  client: 'Bresler',
  concept: 'Retainer mensual · Mayo',
  amount: '12.480.000',
  due: '15 May',
  status: ['success', 'Pagado']
}, {
  id: 'INC-2026-0470',
  client: 'Acme Corp',
  concept: 'Sprint adicional Q2',
  amount: '4.250.000',
  due: '18 May',
  status: ['warning', 'Pendiente']
}, {
  id: 'INC-2026-0468',
  client: 'Zurita SpA',
  concept: 'Licencia portal · anual',
  amount: '9.900.000',
  due: '02 May',
  status: ['error', 'Vencido']
}, {
  id: 'INC-2026-0465',
  client: 'Felipe Z.',
  concept: 'Consultoría capacidad',
  amount: '3.120.000',
  due: '22 May',
  status: ['info', 'En revisión']
}, {
  id: 'INC-2026-0461',
  client: 'Bresler',
  concept: 'Setup integración Notion',
  amount: '2.640.000',
  due: '28 Abr',
  status: ['success', 'Pagado']
}, {
  id: 'INC-2026-0459',
  client: 'Acme Corp',
  concept: 'Retainer mensual · Abril',
  amount: '12.480.000',
  due: '15 Abr',
  status: ['success', 'Pagado']
}];
function StatChip({
  label,
  value,
  tone
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      padding: '14px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      minWidth: 150
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)',
      fontWeight: 600
    }
  }, label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: '"tnum" 1',
      fontSize: '1.35rem',
      fontWeight: 800,
      color: tone || 'var(--text-primary)'
    }
  }, value));
}
function GH_Finance() {
  const [tab, setTab] = React.useState('income');
  const tabs = [['income', 'Ingresos'], ['expenses', 'Egresos'], ['suppliers', 'Proveedores'], ['reconciliation', 'Conciliación']];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(StatChip, {
    label: "Facturado (mes)",
    value: "$ 44.9M"
  }), /*#__PURE__*/React.createElement(StatChip, {
    label: "Cobrado",
    value: "$ 27.6M",
    tone: "var(--success)"
  }), /*#__PURE__*/React.createElement(StatChip, {
    label: "Por cobrar",
    value: "$ 17.3M",
    tone: "var(--warning-ink)"
  }), /*#__PURE__*/React.createElement(StatChip, {
    label: "Vencido",
    value: "$ 9.9M",
    tone: "var(--error)"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4,
      borderBottom: '1px solid var(--border-subtle)'
    }
  }, tabs.map(([id, label]) => /*#__PURE__*/React.createElement("button", {
    key: id,
    onClick: () => setTab(id),
    style: {
      padding: '10px 16px',
      border: 'none',
      background: 'transparent',
      cursor: 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-label-md-size)',
      fontWeight: 600,
      color: tab === id ? 'var(--primary)' : 'var(--text-secondary)',
      borderBottom: tab === id ? '2px solid var(--primary-light)' : '2px solid transparent',
      marginBottom: -1
    }
  }, label))), /*#__PURE__*/React.createElement(Card, {
    padding: "none",
    title: "Ingresos",
    subtitle: "6 facturas \xB7 Mayo 2026",
    action: /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "outlined",
      startIcon: "ti ti-filter"
    }, "Filtros"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      startIcon: "ti ti-plus"
    }, "Nueva factura"))
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, ['Folio', 'Cliente', 'Concepto', 'Monto', 'Vence', 'Estado', ''].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      padding: '11px 20px',
      fontSize: 'var(--type-overline-size)',
      fontWeight: 600,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      color: 'var(--text-disabled)',
      borderBottom: '1px solid var(--border-subtle)',
      textAlign: i === 3 ? 'right' : 'left'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, ROWS.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.id,
    style: {
      transition: 'background var(--motion-short)'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--surface-alt)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent'
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 20px',
      borderBottom: '1px solid var(--surface-alt)',
      fontFamily: 'var(--font-numeric)',
      fontSize: 'var(--type-numeric-id-size)',
      fontWeight: 600,
      color: 'var(--text-secondary)',
      letterSpacing: '.01em'
    }
  }, r.id), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 20px',
      borderBottom: '1px solid var(--surface-alt)',
      fontSize: 'var(--type-body-md-size)',
      fontWeight: 600,
      color: 'var(--text-primary)'
    }
  }, r.client), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 20px',
      borderBottom: '1px solid var(--surface-alt)',
      fontSize: 'var(--type-body-md-size)',
      color: 'var(--text-secondary)'
    }
  }, r.concept), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 20px',
      borderBottom: '1px solid var(--surface-alt)',
      fontFamily: 'var(--font-numeric)',
      fontFeatureSettings: '"tnum" 1',
      fontSize: 'var(--type-numeric-amount-size)',
      fontWeight: 700,
      color: 'var(--text-primary)',
      textAlign: 'right'
    }
  }, "$ ", r.amount), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 20px',
      borderBottom: '1px solid var(--surface-alt)',
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, r.due), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 20px',
      borderBottom: '1px solid var(--surface-alt)'
    }
  }, /*#__PURE__*/React.createElement(StatusChip, {
    status: r.status[0],
    dot: true,
    size: "sm"
  }, r.status[1])), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: '13px 20px',
      borderBottom: '1px solid var(--surface-alt)',
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "ti ti-dots-vertical",
    label: "Opciones",
    size: "sm"
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--text-secondary)'
    }
  }, "Mostrando 1\u20136 de 23"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "ti ti-chevron-left",
    label: "Anterior",
    variant: "outlined",
    size: "sm"
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "ti ti-chevron-right",
    label: "Siguiente",
    variant: "outlined",
    size: "sm"
  })))));
}
window.GH_Finance = GH_Finance;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greenhouse/FinanceScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/greenhouse/LoginScreen.jsx
try { (() => {
// Greenhouse Login — credentials + SSO (Microsoft Entra ID, Google).
const {
  Button,
  Input
} = window.AXISEfeonceGreenhouseDesignSystem_9781a6;
function GH_Login({
  onLogin
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100%',
      fontFamily: 'var(--font-sans)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: '0 0 46%',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100%',
      maxWidth: 360,
      display: 'flex',
      flexDirection: 'column',
      gap: 22
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/greenhouse-full.svg",
    alt: "Greenhouse",
    style: {
      height: 30,
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--type-headline-lg-size)',
      fontWeight: 700,
      color: 'var(--text-primary)'
    }
  }, "Bienvenido de vuelta"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--type-body-md-size)',
      color: 'var(--text-secondary)',
      lineHeight: 1.5
    }
  }, "Inicia sesi\xF3n para acceder a tu portal.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "Correo de trabajo",
    placeholder: "nombre@empresa.com",
    startIcon: "ti ti-mail",
    defaultValue: "julio@efeoncepro.com"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Contrase\xF1a",
    type: "password",
    startIcon: "ti ti-lock",
    defaultValue: "123456"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: -4
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => e.preventDefault(),
    style: {
      fontSize: 'var(--type-body-sm-size)',
      color: 'var(--primary)',
      fontWeight: 600,
      textDecoration: 'none'
    }
  }, "\xBFOlvidaste tu contrase\xF1a?")), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    fullWidth: true,
    size: "lg",
    onClick: onLogin
  }, "Iniciar sesi\xF3n")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      color: 'var(--text-disabled)',
      fontSize: 'var(--type-body-sm-size)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  }), " o contin\xFAa con ", /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--border-subtle)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "outlined",
    fullWidth: true,
    startIcon: "ti ti-brand-windows",
    onClick: onLogin,
    style: {
      color: 'var(--text-secondary)',
      borderColor: 'var(--border-subtle)'
    }
  }, "Microsoft"), /*#__PURE__*/React.createElement(Button, {
    variant: "outlined",
    fullWidth: true,
    startIcon: "ti ti-brand-google",
    onClick: onLogin,
    style: {
      color: 'var(--text-secondary)',
      borderColor: 'var(--border-subtle)'
    }
  }, "Google")), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--type-disclosure-size)',
      color: 'var(--text-disabled)',
      lineHeight: 1.5,
      letterSpacing: '.03em'
    }
  }, "Al continuar aceptas los t\xE9rminos de servicio de Efeonce Group SpA y nuestra pol\xEDtica de privacidad."))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      background: 'var(--brand-navy)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'radial-gradient(900px 500px at 80% -10%, rgba(110,194,7,.20), transparent 60%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      maxWidth: 420,
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/negative-isotipo-green.svg",
    alt: "",
    style: {
      height: 54,
      alignSelf: 'flex-start'
    }
  }), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: 'var(--font-display)',
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.2
    }
  }, "Lectura ejecutiva sobre tus fuentes reales."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--type-body-lg-size)',
      lineHeight: 1.6,
      color: 'rgba(255,255,255,.78)'
    }
  }, "Dashboards, finanzas, n\xF3mina y capacidad del equipo \u2014 gobernados, multi-tenant y en un solo lugar."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginTop: 6,
      color: 'rgba(255,255,255,.6)',
      fontSize: 'var(--type-body-sm-size)'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logos/logo-negative.svg",
    alt: "Efeonce",
    style: {
      height: 16,
      opacity: .9
    }
  }), /*#__PURE__*/React.createElement("span", null, "\xB7 Empower your Growth")))));
}
window.GH_Login = GH_Login;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/greenhouse/LoginScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.KpiCard = __ds_scope.KpiCard;

__ds_ns.StatusChip = __ds_scope.StatusChip;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Card = __ds_scope.Card;

})();
