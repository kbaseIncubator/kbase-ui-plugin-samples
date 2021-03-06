import SampleServiceClient, {
    GetDataLinksFromSampleParams,
    GetMetadataKeyStaticMetadataParams,
    GetSampleACLsParams,
    GetSampleParams
} from "lib/client/SampleServiceClient";

const SAMPLE_ID = '5cdb2854-b194-4644-a4c6-6ff2ed24b9c8';

const TEST_FETCH_TIMEOUT = 10000;

function makeSampleServiceClient() {
    return new SampleServiceClient({
        timeout: TEST_FETCH_TIMEOUT,
        url: 'http://localhost:3333/services/sampleservice'
    });
}

describe('SampleServiceClient', () => {
    test('It can be created without error', () => {
        const client = makeSampleServiceClient();
        expect(client).toBeDefined();
    });

    // TODO: implement mock back end and then re-enable test
    // test('Can successfully call the "status" method', async () => {
    //     const client = makeSampleServiceClient();
    //     const result = await client.status();
    //     expect(result).toBeDefined();
    //     // expect(result).toEqual(STATUS_RESULT)
    // });

    test('Can successfully call the "get_sample_acls" method', async () => {
        const client = makeSampleServiceClient();
        const params: GetSampleACLsParams = {
            id: SAMPLE_ID,
            as_admin: 0
        }
        const result = await client.get_sample_acls(params);
        expect(result).toBeDefined();
        // expect(result).toEqual(SAMPLE_ACLS['sample2'])
    });

    test('Can successfully call the "get_sample" method', async () => {
        const client = makeSampleServiceClient();
        const params: GetSampleParams = {
            id: SAMPLE_ID
        }
        const result = await client.get_sample(params);
        expect(result).toBeDefined();
        // expect(result).toEqual(GET_SAMPLE_SAMPLES['sample1'])
    });

    test('Can successfully call the "get_data_links_from_sample" method', async () => {
        const client = makeSampleServiceClient();
        const params: GetDataLinksFromSampleParams = {
            id: SAMPLE_ID,
            version: 1
        }
        const result = await client.get_data_links_from_sample(params);
        expect(result).toBeDefined();
        // expect(result).toEqual(GET_DATA_LINKS_FROM_SAMPLE_RESULT_EMPTY)
    });

    xtest('Can successfully call the "get_metadata_key_static_metadata" method', async () => {
        const client = makeSampleServiceClient();
        const params: GetMetadataKeyStaticMetadataParams = {
            keys: [],
            prefix: 0
        }
        const result = await client.get_metadata_key_static_metadata(params);
        expect(result).toBeDefined();
        // expect(result).toEqual(GET_METADATA_KEY_STATIC_METADATA_EMPTY)
    });

    // Our "faked" sample service methods; these do not call fetch, so we can use the
    // built-in fake data.

    test('Can successfully call the "get_field_groups" method', async () => {
        const client = makeSampleServiceClient();
        const result = await client.get_field_groups();
        expect(result).toBeDefined();
        // All we really depend on in this codebase is the  presence of geolocation, and within
        // that latitude and longitude.
        expect(result.groups.map(({name}) => {
            return name;
        })).toContain('geolocation');
        const geolocationGroup = result.groups.filter(({name}) => {
            return name === 'geolocation';
        })[0];
        expect(geolocationGroup.fields).toContain('latitude');
        expect(geolocationGroup.fields).toContain('longitude');
    });
});

//
// describe('SampleServiceClient with mocked field definitions', () => {
//     beforeEach(() => {
//         setupMocks2();
//     });
//
//     afterEach(() => {
//         teardownMocks();
//     });
//
//     test('Can successfully call the "get_field_definitions" method', async () => {
//         const client = makeSampleServiceClient();
//         const params: GetFieldDefinitionsParams = {
//             keys: ['foo']
//         }
//         const result = await client.get_field_definitions(params);
//         expect(result).toBeDefined();
//         expect(result).toMatchObject({
//             fields: [SCHEMA_FIELD_FOO]
//         });
//     });
//
//     test('Can call the "get_field_definitions" method with a bad field key and get an error', async () => {
//         const client = makeSampleServiceClient();
//         const params: GetFieldDefinitionsParams = {
//             keys: ['bad_foo']
//         }
//
//         expect(async () => {
//             return await client.get_field_definitions(params);
//         }).rejects.toThrow();
//     });
//
//     test('Can call the "get_field_definitions" method with a bad field key and get an error', async () => {
//         const client = makeSampleServiceClient();
//         const params: GetFieldDefinitionsParams = {
//             keys: ['bad_foo']
//         }
//
//         expect(async () => {
//             return await client.get_field_definitions(params);
//         }).rejects.toThrow();
//     });
//
//     test('Can call the "get_field_definitions" method with an invalid field definition and get an error', async () => {
//         const client = makeSampleServiceClient();
//         const params: GetFieldDefinitionsParams = {
//             keys: ['bad_json']
//         }
//
//         expect(async () => {
//             return await client.get_field_definitions(params);
//         }).rejects.toThrow();
//     });
// });
