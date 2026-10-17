// Copyright (c) 2026-present Antimatter contributors. All Rights Reserved.
// See LICENSE.txt for license information.

// Run with: node --test scripts/msi_project_created.test.js

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {test} = require('node:test');

const msiProjectCreated = require('./msi_project_created');
const {addPolicyProperties} = require('./msi_project_created');

const PROJECT = `<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Product Id="*" Name="Antimatter" UpgradeCode="{FC1E639B-7BFC-40F8-BD17-633F142321C1}" Version="6.4.0.0" Language="1033" Codepage="65001" Manufacturer="Antimatter">
    <Feature Id="ProductFeature" Absent="disallow">
      <ComponentGroupRef Id="ProductComponents"/>
    </Feature>
    <ComponentGroup Id="ProductComponents" Directory="APPLICATIONFOLDER">
    </ComponentGroup>
  </Product>
</Wix>
`;

test('adds the policy components to the product feature', () => {
    const wxs = addPolicyProperties(PROJECT);
    assert.match(wxs, /<ComponentGroupRef Id="ProductComponents"\/>\s*<ComponentGroupRef Id="AntimatterPolicyComponents"\/>/);
    assert.match(wxs, /<ComponentGroup Id="AntimatterPolicyComponents" Directory="TARGETDIR">[\s\S]*<\/ComponentGroup>\s*<\/Product>/);
});

test('declares the public properties for silent installs', () => {
    const wxs = addPolicyProperties(PROJECT);
    for (const property of ['SERVERURL', 'SERVERNAME', 'DEFAULTUSERNAME', 'AUTOUPDATE', 'SERVERMANAGEMENT']) {
        assert.match(wxs, new RegExp(`<Property Id="${property}"[^>]*Secure="yes"`), property);
    }
});

test('writes each policy only when its property is given, under the Antimatter policy key', () => {
    const wxs = addPolicyProperties(PROJECT);
    const component = (id) => wxs.match(new RegExp(`<Component Id="${id}"[\\s\\S]*?</Component>`))?.[0] ?? '';

    assert.match(component('AntimatterPolicyServer'), /<Condition><!\[CDATA\[SERVERURL\]\]><\/Condition>/);
    assert.match(component('AntimatterPolicyServer'), /Root="HKLM" Key="SOFTWARE\\Policies\\Antimatter\\DefaultServerList" Name="\[SERVERNAME\]" Type="string" Value="\[SERVERURL\]"/);

    assert.match(component('AntimatterPolicyUsername'), /<Condition><!\[CDATA\[DEFAULTUSERNAME\]\]><\/Condition>/);
    assert.match(component('AntimatterPolicyUsername'), /Key="SOFTWARE\\Policies\\Antimatter" Name="DefaultUsername" Type="string" Value="\[DEFAULTUSERNAME\]"/);

    assert.match(component('AntimatterPolicyAutoUpdate'), /AUTOUPDATE = "0" OR AUTOUPDATE = "1"/);
    assert.match(component('AntimatterPolicyAutoUpdate'), /Name="EnableAutoUpdater" Type="integer" Value="\[AUTOUPDATE\]"/);

    assert.match(component('AntimatterPolicyServerManagement'), /SERVERMANAGEMENT = "0" OR SERVERMANAGEMENT = "1"/);
    assert.match(component('AntimatterPolicyServerManagement'), /Name="EnableServerManagement" Type="integer" Value="\[SERVERMANAGEMENT\]"/);
});

test('always records the install folder, so the app knows it was installed by the MSI', () => {
    const wxs = addPolicyProperties(PROJECT);
    const component = wxs.match(/<Component Id="AntimatterInstallDir"[\s\S]*?<\/Component>/)?.[0] ?? '';
    assert.doesNotMatch(component, /<Condition>/);
    assert.match(component, /Root="HKLM" Key="SOFTWARE\\Antimatter\\Desktop" Name="InstallDir" Type="string" Value="\[APPLICATIONFOLDER\]" KeyPath="yes"/);
});

test('gives every component its own fixed, upper case GUID', () => {
    const wxs = addPolicyProperties(PROJECT);
    const guids = [...wxs.matchAll(/<Component Id="[^"]+" Guid="\{([^}]+)\}">/g)].map((match) => match[1]);
    assert.equal(guids.length, 5);
    assert.equal(new Set(guids).size, guids.length);
    for (const guid of guids) {
        assert.match(guid, /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/);
    }
});

test('balances the elements it adds', () => {
    const wxs = addPolicyProperties(PROJECT);
    const count = (pattern) => (wxs.match(pattern) || []).length;
    assert.equal(count(/<Component /g), count(/<\/Component>/g));
    assert.equal(count(/<ComponentGroup /g), count(/<\/ComponentGroup>/g));
    assert.equal(count(/<Condition>/g), count(/<\/Condition>/g));
});

test('runs only once on a project', () => {
    const once = addPolicyProperties(PROJECT);
    assert.equal(addPolicyProperties(once), once);
});

test('fails the build rather than ship an MSI without the properties', () => {
    assert.throws(() => addPolicyProperties('<Wix><Product></Product></Wix>'), /cannot add the policy properties/);
});

test('finds its anchors in electron-builder\'s MSI template', () => {
    const template = fs.readFileSync(require.resolve('app-builder-lib/templates/msi/template.xml'), 'utf8');
    assert.ok(template.includes('<ComponentGroupRef Id="ProductComponents"/>'));
    assert.equal(template.split('</Product>').length, 2);
});

test('rewrites the project file electron-builder hands it', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'am-msi-'));
    try {
        const file = path.join(dir, 'project.wxs');
        fs.writeFileSync(file, PROJECT);
        await msiProjectCreated(file);
        assert.ok(fs.readFileSync(file, 'utf8').includes('AntimatterPolicyComponents'));
    } finally {
        fs.rmSync(dir, {recursive: true, force: true});
    }
});
