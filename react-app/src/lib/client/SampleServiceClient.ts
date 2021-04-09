import sesarData from "./formats/sesar/sesar.json";
import enigmaData from "./formats/enigma/enigma.json";
import kbaseData from "./formats/kbase/kbase.json";
import categoriesData from "./samples/categories.json";
import {
    FieldCategory,
    FieldGroup,
    Format,
    SchemaField,
} from "./samples/Samples";
import {
    EpochTimeMS,
    Sample,
    SampleId,
    SampleNodeId,
    SampleVersion,
    SDKBoolean,
    Username,
    WSUPA,
} from "./Sample";
import {DynamicServiceClient} from "@kbase/ui-lib";
import {JSONObject, objectToJSONObject} from "@kbase/ui-lib/lib/lib/json";


const sesarFormatData = sesarData as Format;
const enigmaFormatData = enigmaData as Format;
const kbaseFormatData = kbaseData as Format;
const allFormats: { [k: string]: Format } = {
    sesar: sesarFormatData,
    enigma: enigmaFormatData,
    kbase: kbaseFormatData
}
export const ALL_CATEGORIES = categoriesData as Array<FieldCategory>;

export const SCHEMA_BASE_URL = 'https://ghcdn.rawgit.org/eapearson/kbase-schema/main/schemas';

export interface StatusResult extends JSONObject {
    state: string;
    message: string;
    version: string;
    git_url: string;
    git_commit_hash: string;
}

/* Types for the get_sample method*/
export interface GetSampleParams {
    id: SampleId;
    version?: number;
    as_admin?: SDKBoolean;
}

export type GetSampleResult = Sample;

/* Types for the get_data_links_from_sample method */
export interface GetDataLinksFromSampleParams {
    id: SampleId;
    version: SampleVersion;
    effective_time?: EpochTimeMS;
}

export type DataId = string;

export interface DataLink extends JSONObject {
    linkid: string;
    upa: WSUPA;
    dataid: DataId | null;
    id: SampleId;
    version: SampleVersion;
    node: SampleNodeId;
    created: EpochTimeMS;
    createdby: Username;
    expiredby: Username | null;
    expired: EpochTimeMS | null;
}

export type DataLinks = Array<DataLink>;

export interface GetDataLinksFromSampleResult {
    links: DataLinks;
}

// TODO: document
export type KeyPrefix = 0 | 1 | 2;

export interface GetMetadataKeyStaticMetadataParams extends JSONObject {
    keys: Array<string>;
    prefix: KeyPrefix;
}

// export type MetadataValue = int | float | string;

export interface StaticMetadataValue {
    display_name: string;
    description?: string;
}

export interface StaticMetadata {
    [key: string]: StaticMetadataValue;
}

export interface GetMetadataKeyStaticMetadataResult {
    static_metadata: StaticMetadata;
}

export interface GetSampleACLsParams extends JSONObject {
    id: SampleId;
    as_admin: SDKBoolean;
}

export interface SampleACLs extends JSONObject {
    owner: Username;
    admin: Array<Username>;
    write: Array<Username>;
    read: Array<Username>;
}

export type GetSampleACLsResult = SampleACLs;

export interface GetFormatParams {
    id: string;
    version?: number;
}

export interface FormatSource {
    name: string;
    url: string;
    logoUrl: string;
}

export type FormatFieldType =
    | "string"
    | "number"
    | "boolean"
    | "date"
    | "enum<string>"
    | "controlled_list";

// Field Definitions

export interface FormatFieldBase {
    // id: string;
    type: FormatFieldType;
    label: string;
    // tooltip: string;
    description?: string;
    notes?: Array<string>;
    units?: {
        available?: Array<string>;
        availableFromList?: string;
        canonical?: string;
        fromField?: string;
    };
    constraints?: FormatFieldBaseConstraints;
}

export interface FormatFieldBaseConstraints {
    required?: boolean;
}

// NB using type intersection rather than extends, since we are also extending the
// nested interface for constraints.
// see, e.g.: https://stackoverflow.com/questions/53636756/typescript-interface-extending-another-interface-with-nested-properties

// String

export interface FormatFieldStringConstraints
    extends FormatFieldBaseConstraints {
    minimumLength?: number;
    maximumLength?: number;
    regex?: string;
    suggestedList: string;
    url?: boolean;
}

export interface FormatFieldString extends FormatFieldBase {
    type: "string";
    constraints?: FormatFieldStringConstraints;
} // Controlled List

export interface FormatFieldControlledListConstraints
    extends FormatFieldBaseConstraints {
    list?: string;
    lists?: Array<string>;
}

export interface FormatFieldControlledList extends FormatFieldBase {
    type: "controlled_list";
    constraints: FormatFieldControlledListConstraints;
} // Number

export interface FormatFieldNumberConstraints
    extends FormatFieldBaseConstraints {
    gte?: number;
    gt?: number;
    lte?: number;
    lt?: number;
}

export interface FormatFieldNumber extends FormatFieldBase {
    type: "number";
    constraints?: FormatFieldNumberConstraints;
    format?: {
        type: string;
        decimalPlaces?: number;
    };
} // date

export interface FormatFieldDateConstraints extends FormatFieldBaseConstraints {
    gte?: number;
    gt?: number;
    lte?: number;
    lt?: number;
}

export interface FormatFieldDate extends FormatFieldBase {
    type: "date";
    constraints?: FormatFieldDateConstraints;
} // boolean

export interface FormatFieldBooleanConstraints
    extends FormatFieldBaseConstraints {
}

export interface FormatFieldBoolean extends FormatFieldBase {
    type: "boolean";
    constraints?: FormatFieldBooleanConstraints;
} // enum

export interface FormatFieldEnumConstraints extends FormatFieldBaseConstraints {
    values: Array<string>;
}

export interface FormatFieldEnum extends FormatFieldBase {
    type: "enum<string>";
    constraints: FormatFieldEnumConstraints;
}

export type FormatField =
    | FormatFieldString
    | FormatFieldNumber
    | FormatFieldBoolean
    | FormatFieldDate
    | FormatFieldEnum
    | FormatFieldControlledList;

export interface GetFormatResult {
    format: Format;
}

export interface GetFieldDefinitionsParams {
    keys: Array<string>;
}

export interface GetFieldDefinitionsResult {
    fields: Array<SchemaField>;
}

export interface GetFieldGroupsParams {
}

export interface GetFieldGroupsResult {
    groups: Array<FieldGroup>;
}

export interface GetFieldCategoriesParams {
    ids?: Array<string>
}

export interface GetFieldCategoriesResult {
    categories: Array<FieldCategory>;
}

export default class SampleServiceClient extends DynamicServiceClient {
    module: string = "SampleService";

    async status(): Promise<StatusResult> {
        const [result] = await this.callFunc<[], [StatusResult]>("status", []);
        return result;
    }

    async get_sample(params: GetSampleParams): Promise<GetSampleResult> {
        // TODO: revive the effort to provide result verification and type coercion.
        const [result] = (await this.callFunc<[JSONObject], [JSONObject]>(
            "get_sample",
            [objectToJSONObject(params)],
        ) as unknown) as Array<GetSampleResult>;
        return result;
    }

    async get_data_links_from_sample(
        params: GetDataLinksFromSampleParams,
    ): Promise<GetDataLinksFromSampleResult> {
        const [result] = await this.callFunc<[JSONObject],
            [JSONObject]>("get_data_links_from_sample", [objectToJSONObject(params)]);
        return (result as unknown) as GetDataLinksFromSampleResult;
    }

    async get_metadata_key_static_metadata(
        params: GetMetadataKeyStaticMetadataParams,
    ): Promise<GetMetadataKeyStaticMetadataResult> {
        const [result] = await this.callFunc<[GetMetadataKeyStaticMetadataParams],
            [JSONObject]>("get_metadata_key_static_metadata", [params]);
        return (result as unknown) as GetMetadataKeyStaticMetadataResult;
    }

    async get_sample_acls(
        params: GetSampleACLsParams,
    ): Promise<GetSampleACLsResult> {
        const [result] = await this.callFunc<[GetSampleACLsParams],
            [GetSampleACLsResult]>("get_sample_acls", [params]);
        return result;
    }

    // These are not part of the sample service api, but should be:

    async get_field_categories(
        params: GetFieldCategoriesParams,
    ): Promise<GetFieldCategoriesResult> {
        const categories = (() => {
            const {ids} = params;
            if (ids !== undefined) {
                return ALL_CATEGORIES.filter((category) => {
                    return ids.includes(category.id);
                });
            } else {
                return ALL_CATEGORIES;
            }
        })();

        return Promise.resolve({
            categories
        });
    }

    async get_format(params: GetFormatParams): Promise<GetFormatResult> {
        const format = (() => {
            if (params.id in allFormats) {
                return allFormats[params.id];
            }

            throw new Error(`Sorry, ${params.id} not a recognized format`);
        })();
        return Promise.resolve({
            format,
        });
    }

    async get_field_definitions(
        params: GetFieldDefinitionsParams,
    ): Promise<GetFieldDefinitionsResult> {
        const fields = await Promise.all(params.keys.map(async (key) => {
            const scrubbedKey = key.replace(/[?:#$%^&*()-+=]/, "_");
            const url = `${SCHEMA_BASE_URL}/samples/fields/${scrubbedKey}.1-0-0.json`;
            console.log('FETCHING FIELD', url);
            // `${process.env.PUBLIC_URL}/schemas/fields/${scrubbedKey}.1-0-0.json`,
            const result = await fetch(url);

            if (result.status >= 300) {
                throw new Error(`Error fetching schema for ${key} (${result.status}) (${url})`);
            }

            return await (async () => {
                const payload = await result.text();
                try {
                    return JSON.parse(payload) as SchemaField;
                } catch (ex) {
                    throw new Error(
                        `Invalid JSON schema for field "${key}": ${ex.message}`,
                    );
                }
            })();
        }));
        return {fields};
    }
}
