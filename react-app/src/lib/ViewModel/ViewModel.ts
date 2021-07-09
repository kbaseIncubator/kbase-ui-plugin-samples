import {MetadataValue, SampleId, SampleNodeType, SampleVersion,} from "lib/client/Sample";
import {EpochTimeMS, SimpleMap, Username} from "../types";
import SampleServiceClient, {
    DataLink, GetSampleACLsParams, GetSampleACLsResult, GetSampleParams
} from "../client/SampleServiceClient";
import {Workspace} from "@kbase/ui-lib";
import {ObjectInfo} from "@kbase/ui-lib/lib/lib/comm/coreServices/Workspace";
import {LinkedData} from "redux/store/linkedData";
import UserProfileClient, {UserProfile} from "@kbase/ui-lib/lib/lib/comm/coreServices/UserProfile";
import {ControlledField} from "../client/ControlledField";
import {FieldNumberValue, FieldStringValue, FieldValue, UserFieldValue} from "./Field";

// Constants
import {UPSTREAM_TIMEOUT} from "../../appConstants";

// Types

export type FieldDefinitionsMap = { [key: string]: ControlledField; };

export interface Version {
    at: EpochTimeMS;
    by: User;
    version: number;
}

export interface Sample {
    // id generated by sample service
    id: SampleId;

    // supplied in the sample as the ____
    name: string;

    // supplied in the sample as some field mapped to the sample id; must be
    // unique
    sampleId: string;

    // Supplied in the sample as some field mapped to another sample
    parentSampleId: string | null;

    // Chosen in the sample importer; is it used for anything?
    type: string;

    // created: {
    //     at: EpochTimeMS;
    //     by: User;
    // };

    firstVersion: Version;
    currentVersion: Version;
    latestVersion: Version;

    metadata: Array<MetadataField>;
    controlled: SimpleMap<MetadataControlledField>;
}

export interface User {
    username: Username;
    realname: string;
    gravatarHash: string;
    avatarOption?: string;
    gravatarDefault?: string;
}

// Template

export interface TemplateFieldBase {
    type: string;
}

export interface TemplateFormatField extends TemplateFieldBase {
    type: "metadata";
    key: string;
}

export interface TemplateUserField extends TemplateFieldBase {
    type: "user";
    key: string; // really isn't a key for a user field, but that is all that the
    // sample service gives us for them, so we have to keep it in our
    // fake, and maybe eventually in the real template, so we can use
    // it to pluck the user metadata field out of the samples' meta_user
    label: string;
}

export type TemplateField = TemplateFormatField | TemplateUserField;

// Metadata

export interface UserMetadata {
    [label: string]: string;
}

export interface MetadataFieldBase {
    type: string;
    key: string;
    label: string;
    isEmpty: boolean;
}

export interface MetadataControlledField extends MetadataFieldBase {
    type: "controlled";
    field: FieldValue;
}

export interface MetadataUserField extends MetadataFieldBase {
    type: "user";
    field: UserFieldValue;
}

export type MetadataField =
    | MetadataControlledField
    | MetadataUserField;

export interface MetadataSource {
    [key: string]: MetadataSourceField;
}

export interface MetadataSourceField {
    key: string;
    label: string;
    value: string;
}

export interface FetchSampleProps {
    serviceWizardURL: string;
    userProfileURL: string;
    token: string;
    sampleId: SampleId;
    sampleVersion?: SampleVersion;
    setTitle: (title: string) => void;
}

export interface UserProfileMap {
    [username: string]: UserProfile;
}

export interface ACL {
    admin: Array<User>;
    write: Array<User>;
    read: Array<User>;
}

export interface DataLink2 extends DataLink {
    key: string;
    objectType: string;
    objectName: string;
}

export interface GetSampleResult {
    id: SampleId;
    name: string;
    savedAt: EpochTimeMS;
    savedBy: Username;
    version: SampleVersion;
    sample: {
        id: string;
        parentId: string | null;
        type: SampleNodeType;
        metadata: Array<MetadataField>;
        controlled: SimpleMap<MetadataControlledField>;
    };
}

export default class ViewModel {
    userProfileURL: string;
    sampleServiceURL: string;
    workspaceURL: string;
    token: string;
    timeout: number;
    sampleService: SampleServiceClient;

    constructor(
        {
            userProfileURL,
            sampleServiceURL,
            workspaceURL,
            token,
            timeout,
        }: {
            userProfileURL: string;
            sampleServiceURL: string;
            workspaceURL: string;
            token: string;
            timeout: number;
        },
    ) {
        this.userProfileURL = userProfileURL;
        this.sampleServiceURL = sampleServiceURL;
        this.workspaceURL = workspaceURL;
        this.token = token;
        this.timeout = timeout;
        this.sampleService = new SampleServiceClient({
            url: this.sampleServiceURL,
            token,
            timeout
        });
    }

    async fetchUsers(
        {usernames}: { usernames: Array<Username>; },
    ): Promise<Array<User>> {
        const userProfileClient = new UserProfileClient({
            token: this.token,
            url: this.userProfileURL,
            timeout: UPSTREAM_TIMEOUT,
        });

        const profiles = await userProfileClient.get_user_profile(usernames);

        if (profiles.length !== usernames.length) {
            const profileUsernames = profiles.map(({user: {username}}) => {
                return username;
            });
            const missing = usernames.filter((username) => {
                return !profileUsernames.includes(username);
            });
            throw new Error(`Users could not be found: ${missing.join(', ')}`);
        }

        return profiles.map((profile) => {
            const {
                user: {
                    username,
                    realname,
                },
                profile: {
                    synced: {
                        gravatarHash,
                    },
                    userdata: {
                        gravatarDefault,
                        avatarOption,
                    },
                },
            } = profile;
            return {
                username,
                realname,
                gravatarHash,
                gravatarDefault,
                avatarOption,
            };
        });
    }

    async fetchSample(
        {id: sampleId, version: sampleVersion}: { id: string; version?: number; },
    ): Promise<Sample> {
        const getSampleParams: GetSampleParams = {
            id: sampleId
        };
        if (typeof sampleVersion !== 'undefined') {
            getSampleParams.version = sampleVersion;
        }
        const sampleResult = await this.getSample(getSampleParams);
        if (typeof sampleVersion !== 'undefined') {
            sampleResult.version = sampleVersion
        }

        const latestSample = await this.getSample({
            id: sampleId,
        });

        const firstSample = await (async () => {
            if (sampleResult.version === 1) {
                return sampleResult;
            }
            return await this.getSample({
                id: sampleId,
                version: 1,
            });
        })();

        const usersToGet = new Set([
            firstSample.savedBy,
            sampleResult.savedBy,
            latestSample.savedBy,
        ]);

        const users = await this.fetchUsers({
            usernames: Array.from(usersToGet.values()),
        });


        const usersMap = users.reduce((usersMap, user) => {
            usersMap.set(user.username, user);
            return usersMap;
        }, new Map<Username, User>());

        const fetchedSample = {
            id: sampleResult.id,
            sampleId: sampleResult.sample.id,
            parentSampleId: sampleResult.sample.parentId,
            type: sampleResult.sample.type,
            name: sampleResult.name,
            firstVersion: {
                at: firstSample.savedAt,
                by: usersMap.get(firstSample.savedBy)!,
                version: 1
            },
            currentVersion: {
                at: sampleResult.savedAt,
                by: usersMap.get(sampleResult.savedBy)!,
                version: sampleResult.version,
            },
            latestVersion: {
                at: latestSample.savedAt,
                by: usersMap.get(latestSample.savedBy)!,
                version: latestSample.version,
            },
            metadata: sampleResult.sample.metadata,
            controlled: sampleResult.sample.controlled,
        };
        // console.log('FETCHED SAMPLE', JSON.stringify(fetchedSample));
        // console.log('FETCHED SAMPLE', fetchedSample.currentVersion);
        return fetchedSample;
    }

    async fetchACL({id}: { id: string; }): Promise<ACL> {
        const aclResult = await this.sampleService.get_sample_acls({
            id,
            as_admin: 0,
        });

        const usersToFetch: Array<Username> = aclResult.admin.concat(
            aclResult.read,
        ).concat(aclResult.write);

        const userProfileClient = new UserProfileClient({
            token: this.token,
            url: this.userProfileURL,
            timeout: UPSTREAM_TIMEOUT,
        });

        const profiles = await userProfileClient.get_user_profile(usersToFetch);
        const profileMap: UserProfileMap = profiles.reduce<UserProfileMap>(
            (profileMap, profile) => {
                profileMap[profile.user.username] = profile;
                return profileMap;
            },
            {},
        );

        return {
            admin: aclResult.admin.map((username) => {
                const profile = profileMap[username];
                return {
                    username,
                    realname: profile.user.realname,
                    gravatarHash: profile.profile.synced.gravatarHash,
                    gravatarDefault: profile.profile.userdata.gravatarDefault,
                    avatarOption: profile.profile.userdata.avatarOption,
                };
            }),
            write: aclResult.write.map((username) => {
                const profile = profileMap[username];
                return {
                    username,
                    realname: profile.user.realname,
                    gravatarHash: profile.profile.synced.gravatarHash,
                    gravatarDefault: profile.profile.userdata.gravatarDefault,
                    avatarOption: profile.profile.userdata.avatarOption,
                };
            }),
            read: aclResult.read.map((username) => {
                const profile = profileMap[username];
                return {
                    username,
                    realname: profile.user.realname,
                    gravatarHash: profile.profile.synced.gravatarHash,
                    gravatarDefault: profile.profile.userdata.gravatarDefault,
                    avatarOption: profile.profile.userdata.avatarOption,
                };
            }),
        };
    }

    async fetchLinkedData({id, version}: {
        id: string;
        version: number;
    }): Promise<LinkedData> {
        const dataLinks = await this.sampleService.get_data_links_from_sample({
            id,
            version
        });

        const objectRefs = dataLinks.links.map((dataLink) => {
            return dataLink.upa;
        });

        if (objectRefs.length === 0) {
            return [];
        }

        const workspaceClient = new Workspace({
            token: this.token,
            url: this.workspaceURL,
            timeout: UPSTREAM_TIMEOUT,
        });

        const objects = objectRefs.map((ref) => {
            return {ref};
        });

        const objectInfos = await workspaceClient.get_object_info3({
            includeMetadata: 1,
            objects
        });

        const objectMap = objectInfos.infos.reduce((objectMap, info) => {
            const [objectId, , , , version, , workspaceId] = info;
            const ref = [workspaceId, objectId, version].join("/");
            objectMap.set(ref, info);
            return objectMap;
        }, new Map<string, ObjectInfo>());

        const result = dataLinks.links.map(
            (dataLink) => {
                const objectInfo = objectMap.get(dataLink.upa);
                if (!objectInfo) {
                    throw new Error("Object not found: " + dataLink.upa);
                }
                return {
                    ...dataLink,
                    key: dataLink.upa,
                    objectName: objectInfo[1],
                    objectType: objectInfo[2],
                };
            },
        );
        console.log('linked data', JSON.stringify(result));
        return result;
    }

    getACL(params: GetSampleACLsParams): Promise<GetSampleACLsResult> {
        return this.sampleService.get_sample_acls(params);
    }

    async getSample(params: GetSampleParams): Promise<GetSampleResult> {
        // 1. Get the sample.
        const rawSample = await this.sampleService.get_sample(params);
        const rawRealSample = rawSample.node_tree[0];

        const controlledKeys = Object.keys(rawSample.node_tree[0].meta_controlled);

        const {fields} = await this.sampleService.get_field_definitions({keys: controlledKeys});

        // Make a map for quick lookup.
        const fieldDefinitions: Map<string, ControlledField> = fields.reduce(
            (defMap, fieldDef) => {
                defMap.set(fieldDef.kbase.sample.key, fieldDef);
                return defMap;
            },
            new Map(),
        );

        // We reconstruct the full metadata here, using the definition of the metadata for this format.
        // A few gotchas here.
        // Currently, the sample importer will transform some sample fields into canonical non-metadata fields:
        // id - the user supplied id (e.g. sample_id for enigma, igsn for sesar)
        // parent_id - the user supplied parent id (e.g. well_name for enigma, parent_igsn for sesar)
        // name -- ???
        // we reverse those back to their original sample field names for metadata. They are of retained in the
        // sample outside the metadata.
        // This is done using the mappings part of the sample format definition.
        // Specifically `mappings.sample` provides a mapping from the sample fields (id, parent_id) to the
        // format-specific names for those fields.
        //
        // Another gotcha is that some fields end up weird after the sample import transformation.
        // See, the sample importer will construct keys schema of column names using certain rules, e.g. space to underscore.
        // This results in some strange keys.
        // I refuse to replicate that in the format spec, but accommodate that (for now ONLY) using a "corrections" mapping.
        // This mapping, `mappings.corrections`, maps from the incorrect to the correct field.
        // e.g. redox_potential_?: redox_potential

        // Simulate template fields.
        const controlledFields: Array<MetadataControlledField> = Object.entries(rawRealSample.meta_controlled)
            .map(([key, {
                value,
                units
            }]): MetadataControlledField => {
                const def = fieldDefinitions.get(key);
                if (!def) {
                    throw new Error(`Undefined  field "${key}"`);
                }
                const field = ((): FieldValue => {
                    switch (def?.type) {
                        case "number":
                            if (typeof value !== 'number') {
                                throw new Error(`Field "${def.kbase.sample.key}" should be string but is a "${typeof value}"`);
                            }
                            return {
                                type: 'number',
                                isEmpty: false,
                                schema: def,
                                numberValue: value,
                                unit: units
                            } as FieldNumberValue;
                        case "string":
                            if (typeof value !== 'string') {
                                throw new Error(`Field "${def.kbase.sample.key}" should be string but is a "${typeof value}"`);
                            }
                            return {
                                type: 'string',
                                isEmpty: false,
                                schema: def,
                                stringValue: value,
                                unit: units
                            } as FieldStringValue;
                    }
                })();
                if (def) {
                    return {
                        type: 'controlled',
                        key,
                        label: def.title,
                        isEmpty: false,
                        field
                    };
                } else {
                    return {
                        type: 'controlled',
                        key,
                        label: key,
                        isEmpty: false,
                        field
                    };
                }
            });

        const userFields: Array<MetadataUserField> = Object.entries(rawSample.node_tree[0].meta_user).map(([key, value]) => {
            return {
                key,
                type: 'user',
                isEmpty: false,
                label: key,
                field: value.value
            };
        });
        const allFields = [...controlledFields, ...userFields];

        const controlled: SimpleMap<MetadataControlledField> = {};
        const metadata = allFields.map<MetadataField>((templateField) => {
            // Skip user fields in the template.
            if (templateField.type === "user") {
                const userFieldValue = rawRealSample.meta_user[templateField.key].value;
                const [key, label] = (() => {
                    if (templateField.key in rawRealSample.meta_controlled) {
                        return [`user:${templateField.key}`, `user:${templateField.key}`];
                    } else {
                        return [templateField.key, templateField.key];
                    }
                })();
                const a: MetadataUserField = {
                    type: "user",
                    key,
                    label,
                    isEmpty: !!userFieldValue,
                    field: userFieldValue
                };
                return a;
            }

            const fieldDefinition = fieldDefinitions.get(templateField.key);

            if (!fieldDefinition) {
                console.error("undefined field", fieldDefinitions, templateField.key);
                throw new Error(
                    `Sorry, field "${templateField.key}" is not defined`,
                );
            }

            const reverseMappedKey = templateField.key;

            const fieldValue: MetadataValue | null = (() => {
                const value = rawRealSample.meta_controlled[reverseMappedKey];
                if (typeof value === "undefined") {
                    return null;
                }
                return value;
            })();

            const field: FieldValue = (() => {
                switch (fieldDefinition.type) {
                    case "string":
                        const y: FieldStringValue = {
                            type: "string",
                            schema: fieldDefinition,
                            isEmpty: fieldValue === null,
                            // unit: fieldValue !== null ? fieldValue.units : undefined,
                            stringValue: fieldValue === null
                                ? fieldValue
                                : fieldValue.value as string,
                        };
                        if ('format' in fieldDefinition) {
                            y.format = fieldDefinition.format;
                        }
                        if (fieldValue !== null && 'units' in fieldValue) {
                            y.unit = fieldValue.units;
                        }
                        return y;
                    case "number":
                        const x: FieldNumberValue = {
                            type: "number",
                            schema: fieldDefinition,
                            isEmpty: fieldValue === null,
                            // unit: fieldValue !== null ? fieldValue.units : undefined,
                            numberValue: fieldValue === null
                                ? fieldValue
                                : fieldValue.value as number,
                        };
                        if (fieldValue !== null && 'units' in fieldValue) {
                            x.unit = fieldValue.units;
                        }
                        return x;
                }
            })();

            const controlledField: MetadataControlledField = {
                type: "controlled",
                key: templateField.key,
                label: fieldDefinition.title,
                isEmpty: field.isEmpty,
                field,
            };
            controlled[templateField.key] = controlledField;
            return controlledField;
        });

        const sample = {
            id: rawSample.id,
            name: rawSample.name,
            savedAt: rawSample.save_date,
            savedBy: rawSample.user,
            version: rawSample.version,
            sample: {
                id: rawRealSample.id,
                type: rawRealSample.type,
                parentId: rawRealSample.parent,
                metadata,
                controlled,
            },
        };
        // console.log('VIEW MODEL SAMPLE', JSON.stringify(sample))
        return sample;
    }
}
