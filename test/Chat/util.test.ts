import { Chat, ChatModel } from '../../src/features/Chat/schema';
import { createTestTableData, testTransaction } from '@mrnafisia/type-query';
import { testPool } from '../testInit';
import { checkChatExistence } from '../../src/features/Chat/util';

describe('checkChatExistence', () => {
    test('chat does not exist', () => {
        const chatData: ChatModel[] = [
            {
                id: BigInt(2),
                title: 'test-title',
                isGroup: true,
                userIDs: [1],
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ];
        const testCase = {
            id: BigInt(1),
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
                    { client, userID: testCase.senderUserID },
                    testCase.id
                );
                if(actionResult.ok){
                    fail('expect action to fail')
                }
                expect(actionResult.error).toStrictEqual([301]);
            },
            testPool
        );
    });
    test('user is not the owner', () => {
        const chatData: ChatModel[] = [
            {
                id: BigInt(1),
                title: 'test-title',
                isGroup: true,
                userIDs: [1],
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ];
        const testCase = {
            id: BigInt(1),
            senderUserID: 2
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
                    { client, userID: testCase.senderUserID },
                    testCase.id
                );
                if(actionResult.ok){
                    fail('expect action to fail')
                }
                expect(actionResult.error).toStrictEqual([301]);
            },
            testPool
        );
    });
    test('chat is not a group', () => {
        const chatData: ChatModel[] = [
            {
                id: BigInt(1),
                title: 'test-title',
                isGroup: false,
                userIDs: [1],
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ];
        const testCase = {
            id: BigInt(1),
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
                    { client, userID: testCase.senderUserID },
                    testCase.id
                );
                if(actionResult.ok){
                    fail('expect action to fail')
                }
                expect(actionResult.error).toStrictEqual([301]);
            },
            testPool
        );
    });
});