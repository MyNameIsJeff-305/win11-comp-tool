const express = require('express');
const router = express.Router();
const axios = require('axios');

const { FRESHSERVICE_API_KEY, FRESHSERVICE_DOMAIN } = process.env;

if (!FRESHSERVICE_API_KEY || !FRESHSERVICE_DOMAIN) {
    throw new Error('FRESHSERVICE_API_KEY or FRESHSERVICE_DOMAIN is not set in environment variables.');
}

// Freshservice target
const FOLDER_ID = 39000023200;
const DRAFT_STATUS = 1; // 1 = Draft, 2 = Published

const fsApi = axios.create({
    baseURL: `https://${FRESHSERVICE_DOMAIN}.freshservice.com/api/v2`,
    auth: { username: FRESHSERVICE_API_KEY, password: 'X' },
    headers: { 'Content-Type': 'application/json' }
});

/* ---------------- Helpers ---------------- */

function escapeHtml(str) {
    return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function toArray(v) {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
}

/** Find a field by label (exact match; case-insensitive). */
function findFieldByLabel(fields, label) {
    const target = String(label).trim().toLowerCase();
    return (fields || []).find(f => String(f?.label || '').trim().toLowerCase() === target) || null;
}

/** Find a field by label for a specific group index (supports common suffix patterns). */
function findFieldByLabelIndexed(fields, baseLabel, index) {
    const base = String(baseLabel).trim();
    const i = Number(index);

    // Match common variations you might have in Tally repeats:
    // "Brand (2)", "Brand 2", "Brand #2", "Brand - 2", "Brand (Firewall 2)"
    const patterns = [
        new RegExp(`^${escapeRegExp(base)}\\s*\\(${i}\\)$`, 'i'),
        new RegExp(`^${escapeRegExp(base)}\\s+${i}$`, 'i'),
        new RegExp(`^${escapeRegExp(base)}\\s*#\\s*${i}$`, 'i'),
        new RegExp(`^${escapeRegExp(base)}\\s*[-–—]\\s*${i}$`, 'i'),
        new RegExp(`^${escapeRegExp(base)}\\s*\\(\\s*firewall\\s*${i}\\s*\\)$`, 'i'),
        new RegExp(`^firewall\\s*${i}\\s+${escapeRegExp(base)}$`, 'i'),
    ];

    return (fields || []).find(f => {
        const lab = String(f?.label || '').trim();
        return patterns.some(re => re.test(lab));
    }) || null;
}

function escapeRegExp(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Resolve option IDs to option text for DROPDOWN/MULTIPLE_CHOICE. */
function resolveOptionValues(field) {
    const selectedIds = toArray(field?.value).filter(Boolean);
    const options = toArray(field?.options);

    if (!selectedIds.length) return null;

    if (options.length) {
        const idToText = new Map(options.map(o => [o.id, o.text]));
        const texts = selectedIds.map(id => idToText.get(id) || id);
        return texts.join(', ');
    }
    return selectedIds.join(', ');
}

function normalizeFieldValue(field) {
    if (!field) return null;

    if (field.type === 'DROPDOWN' || field.type === 'MULTIPLE_CHOICE') {
        const resolved = resolveOptionValues(field);
        return resolved ? String(resolved) : null;
    }

    if (field.type === 'FILE_UPLOAD') {
        // raw file objects; handled separately for images
        const files = toArray(field.value).filter(Boolean);
        return files.length ? files : null;
    }

    if (Array.isArray(field.value)) {
        return field.value.length ? field.value : null;
    }

    return field.value != null && field.value !== '' ? String(field.value) : null;
}

/** "Yes"/"No" check for dropdowns (works with "Yes", "YES", etc.) */
function isYes(value) {
    if (value == null) return false;
    return String(value).trim().toLowerCase() === 'yes';
}

function getClientNameFromPayload(payload) {
    const fields = payload?.data?.fields || [];
    return (fields && fields[0] && fields[0].value) ? String(fields[0].value) : 'Unknown Client';
}

/* ---------------- HTML builders (reference style) ---------------- */

function wrapper(html) {
    return `<div style="font-family:Arial, Helvetica, sans-serif; font-size:12pt; line-height:1.5; color:inherit;">${html}</div>`;
}

function headerCard(title, createdAt, responseId) {
    return `
    <div style="border:1px solid #FFFFFF2E; border-radius:18px; padding:16px; background:#FFFFFF0A;">
      <div style="font-size:18pt; font-weight:800; margin:0 0 4px 0;">${escapeHtml(title)}</div>
      <div style="opacity:.85;">Network assessment captured via Tally webhook and exported to Freshservice.</div>
      <div style="margin-top:12px; border-left:4px solid #FFFFFF59; padding:10px 12px; border-radius:12px; background:#FFFFFF0D;">
        <strong>Captured:</strong> ${escapeHtml(createdAt || 'N/A')}
        <br><strong>Response ID:</strong> ${escapeHtml(responseId || 'N/A')}
        <br><strong>Status:</strong> Draft
      </div>
    </div>
  `;
}

function sectionCard(number, title, subtitle, innerHtml) {
    return `
    <div style="margin-top:14px; border:1px solid #FFFFFF2E; border-radius:18px; padding:14px; background:#FFFFFF0A;">
      <table style="width:100%;">
        <tbody>
          <tr>
            <td style="width:58px;">
              <span style="display:inline-block; min-width:40px; height:40px; line-height:40px; padding:0 12px; border-radius:999px; background:#2B7BBB; color:#FFFFFF; font-weight:800;">${escapeHtml(number)}</span>
            </td>
            <td>
              <div style="font-size:16pt; font-weight:800;">${escapeHtml(title)}</div>
              ${subtitle ? `<div style="opacity:.85;">${escapeHtml(subtitle)}</div>` : ''}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:12px; border-left:4px solid #FFFFFF59; padding:10px 12px; border-radius:12px; background:#FFFFFF0D;">
        ${innerHtml}
      </div>
    </div>
  `;
}

function twoColTable(rows) {
    // rows: [{label, valueHtml}]
    const body = rows
        .filter(r => r && r.valueHtml != null && String(r.valueHtml).trim() !== '')
        .map(r => `
      <tr>
        <td style="width:38%; padding:10px 10px; border-bottom:1px solid #FFFFFF2E; font-weight:800; vertical-align:top;">
          ${escapeHtml(r.label)}
        </td>
        <td style="padding:10px 10px; border-bottom:1px solid #FFFFFF2E; vertical-align:top;">
          ${r.valueHtml}
        </td>
      </tr>
    `)
        .join('');

    return `
    <table style="width:100%; border-collapse:collapse;">
      <tbody>
        ${body || `<tr><td style="padding:10px; opacity:.85;">No data provided.</td></tr>`}
      </tbody>
    </table>
  `;
}

function valueAsHtml(val) {
    if (val == null) return '';
    return escapeHtml(String(val));
}

function imageBlockFromFileUpload(files) {
    const fileArr = toArray(files).filter(Boolean);
    if (!fileArr.length) return '';

    // Render as images (clickable)
    return fileArr.map(f => {
        const name = escapeHtml(f.name || 'image');
        const url = escapeHtml(f.url || '');
        return `
      <div style="margin-top:12px;">
        <div style="font-weight:800; margin-bottom:6px; opacity:.9;">${name}</div>
        <a href="${url}" target="_blank" rel="noreferrer">
          <img src="${url}" alt="${name}" style="max-width:100%; height:auto; border-radius:18px; border:1px solid #FFFFFF2E; display:block;" />
        </a>
      </div>
    `;
    }).join('');
}

/* ---------------- Assessment HTML (TEST SCOPE: only requested elements) ---------------- */

function buildAssessmentHtml_TestScope({ title, fields, createdAt, responseId }) {
    let n = 1;

    // General Information
    const generalRows = [
        { label: 'Client Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Client Name'))) },
        { label: 'Client Address', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Client Address'))) },
        { label: 'City', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'City'))) },
        { label: 'State', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'State'))) },
        { label: 'ZIP Code', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'ZIP Code'))) },
    ];

    // Contact Information
    const contactRows = [
        { label: 'Primary Contact Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Primary Contact Name'))) },
        { label: 'Phone Number', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Phone Number'))) },
        { label: 'Email', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Email'))) },
        { label: 'Location Name', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Location Name'))) },
    ];

    // Main Network Information (+ conditional Static IP)
    const hasStaticIpVal = normalizeFieldValue(findFieldByLabel(fields, 'Has Static IP?'));
    const hasStatic = isYes(hasStaticIpVal);

    const mainNetworkRows = [
        { label: 'Internet Service Provider (ISP)', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Internet Service Provider'))) },
        { label: 'Public IP', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Public IP'))) },
        ...(hasStatic ? [{ label: 'Static IP', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Static IP'))) }] : []),
        { label: 'Subnet', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Subnet'))) },
        { label: 'Gateway', valueHtml: valueAsHtml(normalizeFieldValue(findFieldByLabel(fields, 'Gateway'))) },
    ];

    // Firewall conditional
    const hasFirewallVal = normalizeFieldValue(findFieldByLabel(fields, 'Does the Office have a Firewall?'));
    const hasFirewall = isYes(hasFirewallVal);

    // Build firewall cards if firewall exists.
    // This supports either:
    // - labels without suffix for Firewall 1, plus "(2)" etc for repeats
    // - or labels like "Firewall 2 Brand" etc (handled by indexed finder patterns)
    const firewallCardsHtml = (() => {
        if (!hasFirewall) return '';

        const cards = [];
        for (let i = 1; i <= 10; i++) {
            const brandF = i === 1
                ? (findFieldByLabel(fields, 'Brand') || findFieldByLabelIndexed(fields, 'Brand', 1))
                : findFieldByLabelIndexed(fields, 'Brand', i);

            const modelF = i === 1
                ? (findFieldByLabel(fields, 'Model') || findFieldByLabelIndexed(fields, 'Model', 1))
                : findFieldByLabelIndexed(fields, 'Model', i);

            const serialF = i === 1
                ? (findFieldByLabel(fields, 'Serial Number') || findFieldByLabelIndexed(fields, 'Serial Number', 1))
                : findFieldByLabelIndexed(fields, 'Serial Number', i);

            const locationF = i === 1
                ? (findFieldByLabel(fields, 'Location') || findFieldByLabelIndexed(fields, 'Location', 1))
                : findFieldByLabelIndexed(fields, 'Location', i);

            const uploadF = i === 1
                ? (findFieldByLabel(fields, 'Upload a picture of the Firewall') || findFieldByLabelIndexed(fields, 'Upload a picture of the Firewall', 1))
                : findFieldByLabelIndexed(fields, 'Upload a picture of the Firewall', i);

            const brand = normalizeFieldValue(brandF);
            const model = normalizeFieldValue(modelF);
            const serial = normalizeFieldValue(serialF);
            const loc = normalizeFieldValue(locationF);
            const uploads = normalizeFieldValue(uploadF); // array of file objects or null

            // Stop when we don't find any meaningful data for this index.
            const hasAny = Boolean(brand || model || serial || loc || (uploads && uploads.length));
            if (!hasAny) {
                if (i === 1) {
                    // If firewall is "Yes" but no firewall details, still render one empty card for visibility
                    cards.push(`
            <div style="border:1px solid #FFFFFF2E; border-radius:18px; padding:14px; background:#FFFFFF0A; margin-top:12px;">
              <div style="font-size:14.5pt; font-weight:800; margin:0 0 6px 0;">Firewall 1</div>
              <div style="opacity:.85;">No firewall details provided.</div>
            </div>
          `);
                }
                break;
            }

            const fwTable = twoColTable([
                { label: 'Brand', valueHtml: valueAsHtml(brand) },
                { label: 'Model', valueHtml: valueAsHtml(model) },
                { label: 'Serial Number', valueHtml: valueAsHtml(serial) },
                { label: 'Location', valueHtml: valueAsHtml(loc) },
            ]);

            const fwImages = uploads ? imageBlockFromFileUpload(uploads) : '';

            cards.push(`
        <div style="border:1px solid #FFFFFF2E; border-radius:18px; padding:14px; background:#FFFFFF0A; margin-top:12px;">
          <div style="font-size:14.5pt; font-weight:800; margin:0 0 10px 0;">Firewall ${i}</div>
          ${fwTable}
          ${fwImages}
        </div>
      `);
        }

        // Wrap all firewall cards under the Firewall section content block
        return `
      <div>
        ${cards.join('')}
      </div>
    `;
    })();

    const htmlParts = [];

    htmlParts.push(headerCard(title, createdAt, responseId));

    htmlParts.push(
        sectionCard(String(n++), 'General Information', 'Client/site basics', twoColTable(generalRows))
    );

    htmlParts.push(
        sectionCard(String(n++), 'Contact Information', 'Primary contact details', twoColTable(contactRows))
    );

    // Main Network Information (and optionally firewall cards appended inside same section per your spec)
    const mainNetworkInner = `
    ${twoColTable(mainNetworkRows)}
    ${hasFirewall ? `<div style="margin-top:14px; font-size:15pt; font-weight:800;">Firewalls</div>` : ''}
    ${firewallCardsHtml}
  `;

    htmlParts.push(
        sectionCard(String(n++), 'Main Network Information', 'ISP and addressing', mainNetworkInner)
    );

    return wrapper(htmlParts.join(''));
}

/* ---------------- Route ---------------- */

router.post('/export-to-freshservice', async (req, res) => {
    try {
        const payload = req.body;
        const fields = payload?.data?.fields || [];

        const clientName = getClientNameFromPayload(payload);
        const articleTitle = `Network Assessment ${clientName}`;

        const descriptionHtml = buildAssessmentHtml_TestScope({
            title: articleTitle,
            fields,
            createdAt: payload?.createdAt || payload?.data?.createdAt,
            responseId: payload?.data?.responseId
        });

        const tags = [String(clientName).trim(), 'Network Assessment'].filter(Boolean);

        const createResp = await fsApi.post('/solutions/articles', {
            title: articleTitle,
            description: descriptionHtml,
            status: DRAFT_STATUS,
            folder_id: FOLDER_ID,
            tags
        });

        return res.status(201).json({
            message: 'Draft Knowledge Base article created in Freshservice.',
            article: createResp.data
        });
    } catch (err) {
        const status = err?.response?.status || 500;
        const data = err?.response?.data || { message: err.message };
        console.error('Freshservice create article failed:', status, data);

        return res.status(status).json({
            message: 'Failed to create Freshservice article.',
            details: data
        });
    }
});

module.exports = router;
