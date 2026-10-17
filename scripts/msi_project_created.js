// Copyright (c) 2026-present Antimatter contributors. All Rights Reserved.
// See LICENSE.txt for license information.

// electron-builder's msiProjectCreated hook: adds to the MSI the public properties a company passes to a silent
// install, which write the same machine policies as Group Policy (HKLM\SOFTWARE\Policies\Antimatter):
//
//   msiexec /i antimatter-desktop-<version>-win-x64.msi /qn SERVERURL=https://chat.example.com SERVERNAME=Chat
//     DEFAULTUSERNAME=%USERNAME% AUTOUPDATE=0 SERVERMANAGEMENT=0
//
// It also records the install folder (HKLM\SOFTWARE\Antimatter\Desktop, InstallDir), which is how the app knows it
// was installed per machine by the MSI (src/common/config/installType.ts). Uninstalling the MSI removes these
// values. The values are only written when the property is given, so a policy set by Group Policy is left alone.

const fs = require('fs');

const POLICY_KEY = 'SOFTWARE\\Policies\\Antimatter';
const INSTALL_KEY = 'SOFTWARE\\Antimatter\\Desktop';
const MARKER = 'AntimatterPolicyComponents';

const PROPERTIES = `
    <!-- Antimatter: public properties for silent installs (scripts/msi_project_created.js) -->
    <Property Id="SERVERURL" Secure="yes"/>
    <Property Id="SERVERNAME" Value="Antimatter" Secure="yes"/>
    <Property Id="DEFAULTUSERNAME" Secure="yes"/>
    <Property Id="AUTOUPDATE" Secure="yes"/>
    <Property Id="SERVERMANAGEMENT" Secure="yes"/>

    <ComponentGroup Id="${MARKER}" Directory="TARGETDIR">
      <Component Id="AntimatterInstallDir" Guid="{159E76A0-E360-4C08-A3CF-69F25974F3D7}">
        <RegistryValue Root="HKLM" Key="${INSTALL_KEY}" Name="InstallDir" Type="string" Value="[APPLICATIONFOLDER]" KeyPath="yes"/>
      </Component>
      <Component Id="AntimatterPolicyServer" Guid="{3FEA6E7A-6266-4BDA-96EA-9B17FA88E843}">
        <Condition><![CDATA[SERVERURL]]></Condition>
        <RegistryValue Root="HKLM" Key="${POLICY_KEY}\\DefaultServerList" Name="[SERVERNAME]" Type="string" Value="[SERVERURL]" KeyPath="yes"/>
      </Component>
      <Component Id="AntimatterPolicyUsername" Guid="{9BC8009E-A9A2-43E9-9E96-705991F3AD9C}">
        <Condition><![CDATA[DEFAULTUSERNAME]]></Condition>
        <RegistryValue Root="HKLM" Key="${POLICY_KEY}" Name="DefaultUsername" Type="string" Value="[DEFAULTUSERNAME]" KeyPath="yes"/>
      </Component>
      <Component Id="AntimatterPolicyAutoUpdate" Guid="{9227D543-6951-4DE1-8240-93234F3325B8}">
        <Condition><![CDATA[AUTOUPDATE = "0" OR AUTOUPDATE = "1"]]></Condition>
        <RegistryValue Root="HKLM" Key="${POLICY_KEY}" Name="EnableAutoUpdater" Type="integer" Value="[AUTOUPDATE]" KeyPath="yes"/>
      </Component>
      <Component Id="AntimatterPolicyServerManagement" Guid="{079E7752-8C99-46DE-94FA-15D1B49CF474}">
        <Condition><![CDATA[SERVERMANAGEMENT = "0" OR SERVERMANAGEMENT = "1"]]></Condition>
        <RegistryValue Root="HKLM" Key="${POLICY_KEY}" Name="EnableServerManagement" Type="integer" Value="[SERVERMANAGEMENT]" KeyPath="yes"/>
      </Component>
    </ComponentGroup>
`;

const FEATURE_ANCHOR = '<ComponentGroupRef Id="ProductComponents"/>';
const PRODUCT_END = '</Product>';

function addPolicyProperties(wxs) {
    if (wxs.includes(MARKER)) {
        return wxs;
    }
    if (!wxs.includes(FEATURE_ANCHOR) || !wxs.includes(PRODUCT_END)) {
        throw new Error('msi_project_created: the MSI project does not look like electron-builder\'s template, cannot add the policy properties');
    }
    return wxs.
        replace(FEATURE_ANCHOR, () => `${FEATURE_ANCHOR}\n      <ComponentGroupRef Id="${MARKER}"/>`).
        replace(PRODUCT_END, () => `${PROPERTIES}  ${PRODUCT_END}`);
}

async function msiProjectCreated(projectFile) {
    const wxs = await fs.promises.readFile(projectFile, 'utf8');
    await fs.promises.writeFile(projectFile, addPolicyProperties(wxs), 'utf8');
}

module.exports = msiProjectCreated;
module.exports.default = msiProjectCreated;
module.exports.addPolicyProperties = addPolicyProperties;
