import { testPool } from '../../testInit';
import { FEATURES } from '../../../src/utils/features';
import Operation from '../../../src/features/Chat/operation';
import { Chat, ChatModel } from '../../../src/features/Chat/schema';
import { ClientBase, createTestTableData, testTransaction } from '@mrnafisia/type-query';
import add, { addChat, checkChatExistence, checkValidation } from '../../../src/features/Chat/actions/add';

describe('checkValidation', () => {
    test('title', () => {
        const testCase = {
            userID: 1,
            title: 'a',
            userIDs: [1],
            isGroup: true
        };

        // action
        const actionResult = checkValidation(
            testCase.userID,
            testCase.userIDs,
            testCase.isGroup,
            testCase.title

    );
        if (actionResult.ok) {
            fail('expect action to fail');
        }
        expect(actionResult.error).toStrictEqual([201]);
    });
    test('userIDs-length', () => {
        const testCase = {
            userID: 1,
            title: 'test-title',
            userIDs: [],
            isGroup: true
        };

        // action
        const actionResult = checkValidation(
            testCase.userID,
            testCase.userIDs,
            testCase.isGroup,
            testCase.title
        );
        if (actionResult.ok) {
            fail('expect action to fail');
        }
        expect(actionResult.error).toStrictEqual([202]);
    });
    test('userIDs', () => {
        const testCase = {
            userID: 1,
            title: 'test-title',
            userIDs: [9999999],
            isGroup: true
        };

        // action
        const actionResult = checkValidation(
            testCase.userID,
            testCase.userIDs,
            testCase.isGroup,
            testCase.title
        );
        if (actionResult.ok) {
            fail('expect action to fail');
        }
        expect(actionResult.error).toStrictEqual([202]);
    });
    test('cannot have multiple users in private chat', () => {
        const testCase = {
            userID: 1,
            title: 'test-title',
            userIDs: [1, 2],
            isGroup: false
        };

        // action
        const actionResult = checkValidation(
            testCase.userID,
            testCase.userIDs,
            testCase.isGroup,
            testCase.title
        );
        if (actionResult.ok) {
            fail('expect action to fail');
        }
        expect(actionResult.error).toStrictEqual([205]);
    });
    test('owner can not be in userIDs', () => {
        const testCase = {
            userID: 1,
            title: 'test-title',
            userIDs: [1],
            isGroup: false
        };

        // action
        const actionResult = checkValidation(
            testCase.userID,
            testCase.userIDs,
            testCase.isGroup,
            testCase.title
        );
        if (actionResult.ok) {
            fail('expect action to fail');
        }
        expect(actionResult.error).toStrictEqual([206]);
    });
});

describe('checkChatExistence', () => {
    test('private chat already exists', () => {
        const chatData: ChatModel[] = [
            {
                id: BigInt(1),
                title: null,
                userIDs: ['2'],
                isGroup: false,
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ];

        const testCase = {
            userIDs: [2],
            senderUserID: 1
        };

        return testTransaction(
            [
                createTestTableData(
                    Chat.table,
                    chatData,
                    chatData.map(row => ({ row }))
                )
            ],
            async client => {
                // action
                const actionResult = await checkChatExistence(
                    { userID: testCase.senderUserID, client },
                    testCase.userIDs[0]
                );
                if (!actionResult.ok) {
                    fail('action fail');
                }
                expect(actionResult.value).toStrictEqual(chatData[0].id);
            },
            testPool
        );
    });
    test('private chat does not exist', () => {
        const chatData: ChatModel[] = [
            {
                id: BigInt(1),
                title: null,
                userIDs: ['3'],
                isGroup: false,
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ];

        const testCase = {
            userIDs: [2],
            senderUserID: 1
        };

        return testTransaction(
            [
                createTestTableData(
                    Chat.table,
                    chatData,
                    chatData.map(row => ({ row }))
                )
            ],
            async client => {
                // action
                const actionResult = await checkChatExistence(
                    { userID: testCase.senderUserID, client },
                    testCase.userIDs[0]
                );
                if (!actionResult.ok) {
                    fail('action fail');
                }
                expect(actionResult.value).toStrictEqual(undefined);
            },
            testPool
        );
    });
});

describe('addChat', () => {
    test('ok private chat', () => {
        const testCase = {
            isGroup: false,
            userIDs: ['2'],
            ownerID: 1,
            lastMessageSentAt: new Date()
        };

        return testTransaction(
            [
                createTestTableData(
                    Chat.table,
                    [],
                    [
                        {
                            row: {
                                id: BigInt(1),
                                title: null,
                                ownerID: testCase.ownerID,
                                isGroup: testCase.isGroup,
                                userIDs: testCase.userIDs,
                                lastMessageSentAt: testCase.lastMessageSentAt
                            }
                        }
                    ]
                )
            ],
            async client => {
                // action
                const actionResult = await addChat(
                    { client },
                    {
                        title: null,
                        userIDs: testCase.userIDs,
                        ownerID: testCase.ownerID,
                        isGroup: testCase.isGroup,
                        lastMessageSentAt: testCase.lastMessageSentAt
                    }
                );
                if (!actionResult.ok) {
                    fail('action fail');
                }
                expect(actionResult.value).toStrictEqual(
                    {
                        id: BigInt(1),
                        histories: [
                            {
                                feature: FEATURES.Chat,
                                table: Chat.table.title,
                                row: BigInt(1),
                                operations: [Operation.ADD],
                                data: {
                                    id: BigInt(1),
                                    title: null,
                                    userIDs: testCase.userIDs,
                                    ownerID: testCase.ownerID,
                                    isGroup: testCase.isGroup,
                                    lastMessageSentAt: testCase.lastMessageSentAt
                                }
                            }
                        ]
                    }
                );
            },
            testPool
        );
    });
    test('ok group chat', () => {
        const testCase = {
            title: 'test-title',
            isGroup: true,
            userIDs: ['2', '3'],
            ownerID: 1,
            lastMessageSentAt: new Date()
        };

        return testTransaction(
            [
                createTestTableData(
                    Chat.table,
                    [],
                    [
                        {
                            row: {
                                id: BigInt(1),
                                title: testCase.title,
                                ownerID: testCase.ownerID,
                                isGroup: testCase.isGroup,
                                userIDs: testCase.userIDs,
                                lastMessageSentAt: testCase.lastMessageSentAt
                            }
                        }
                    ]
                )
            ],
            async client => {
                // action
                const actionResult = await addChat(
                    { client },
                    {
                        title: testCase.title,
                        userIDs: testCase.userIDs,
                        ownerID: testCase.ownerID,
                        isGroup: testCase.isGroup,
                        lastMessageSentAt: testCase.lastMessageSentAt
                    }
                );
                if (!actionResult.ok) {
                    fail('action fail');
                }
                expect(actionResult.value).toStrictEqual(
                    {
                        id: BigInt(1),
                        histories: [
                            {
                                feature: FEATURES.Chat,
                                table: Chat.table.title,
                                row: BigInt(1),
                                operations: [Operation.ADD],
                                data: {
                                    id: BigInt(1),
                                    title: testCase.title,
                                    userIDs: testCase.userIDs,
                                    ownerID: testCase.ownerID,
                                    isGroup: testCase.isGroup,
                                    lastMessageSentAt: testCase.lastMessageSentAt
                                }
                            }
                        ]
                    }
                );
            },
            testPool
        );
    });
});

describe('add', () => {
    test('checkValidation fail', async () => {
        const testCase = {
            title: 'a',
            userIDs: [2],
            isGroup: true,
            senderUserID: 1
        }

        // action
        const actionResult = await add(
            {
                userID: testCase.senderUserID,
                client: null as unknown as ClientBase
            },
            testCase.userIDs,
            testCase.isGroup,
            testCase.title
        );
        if (actionResult.ok){
            fail('expect action to fail')
        }
        expect(actionResult.error).toStrictEqual([201])
    });
    test('chatAlreadyExist ok', () => {
        const chatData: ChatModel[] = [
            {
                id: BigInt(1),
                title: null,
                userIDs: ['2'],
                isGroup: false,
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ]
        const testCase = {
            userIDs: [2],
            isGroup: false,
            senderUserID: 1
        }

        return testTransaction(
            [
                createTestTableData(
                    Chat.table,
                    chatData,
                    chatData.map(row => ({row}))
                )
            ],
            async client => {
                // action
                const actionResult = await add(
                    {
                        userID: testCase.senderUserID,
                        client
                    },
                    testCase.userIDs,
                    testCase.isGroup
                );
                if (!actionResult.ok){
                    fail('expect action to fail')
                }
                expect(actionResult.value).toStrictEqual({histories: [], id: chatData[0].id})
            },
            testPool
        )
    });
    test('add ok', () => {
        jest
            .useFakeTimers()
            .setSystemTime(new Date('2020-01-01'));
        const chatData: ChatModel[] = [
            {
                id: BigInt(1),
                title: null,
                userIDs: ['3'],
                isGroup: false,
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ]
        const testCase = {
            userIDs: [2],
            isGroup: false,
            senderUserID: 1
        }

        return testTransaction(
            [
                createTestTableData(
                    Chat.table,
                    chatData,
                    [
                        {
                            row: {
                                ...chatData[0]
                            }
                        },
                        {
                            row:{
                                id: BigInt(2),
                                title: null,
                                userIDs: testCase.userIDs.map(v => v.toString()),
                                ownerID: testCase.senderUserID,
                                isGroup: testCase.isGroup,
                                lastMessageSentAt: new Date()
                            }
                        }
                    ]
                )
            ],
            async client => {
                // action
                const actionResult = await add(
                    {
                        userID: testCase.senderUserID,
                        client
                    },
                    testCase.userIDs,
                    testCase.isGroup
                );
                if (!actionResult.ok){
                    fail('expect action to fail')
                }
                expect(actionResult.value).toStrictEqual(chatData[0].id)
            },
            testPool
        )
    });
})