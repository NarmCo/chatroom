import { checkChatExistence, checkValidation } from '../../../src/features/Chat/actions/add';
import { Chat, ChatModel } from '../../../src/features/Chat/schema';
import { createTestTableData, testTransaction } from '@mrnafisia/type-query';
import { testPool } from '../../testInit';

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
            testCase.title,
            testCase.userIDs,
            testCase.isGroup
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
            testCase.title,
            testCase.userIDs,
            testCase.isGroup
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
            testCase.title,
            testCase.userIDs,
            testCase.isGroup
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
            testCase.title,
            testCase.userIDs,
            testCase.isGroup
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
            testCase.title,
            testCase.userIDs,
            testCase.isGroup
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
                userIDs: ["2"],
                isGroup: false,
                ownerID: 1,
                lastMessageSentAt: new Date()
            }
        ];

        const testCase = {
            userIDs: [2],
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
                const actionResult = await checkChatExistence(
                    { userID: testCase.senderUserID, client},
                    testCase.userIDs[0]
                );
                if (!actionResult.ok){
                    fail('action fail');
                }
                expect(actionResult.value).toStrictEqual(chatData[0].id)
            },
            testPool
        )
    })
})