/* eslint-disable jest-dom/prefer-to-have-class */
import React from 'react';
import testRenderer from 'react-test-renderer';
import { fireEvent, render } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmojiComponentMock from 'emoji-mart/dist-modern/components/emoji/nimble-emoji';

import { Message } from '../Message';
import { MessageOptions as MessageOptionsMock } from '../MessageOptions';
import { MessageSimple } from '../MessageSimple';
import { MessageText } from '../MessageText';

import { Attachment } from '../../Attachment/Attachment';

import { ChannelActionProvider } from '../../../context/ChannelActionContext';
import { ChannelStateProvider } from '../../../context/ChannelStateContext';
import { ChatProvider } from '../../../context/ChatContext';
import { EmojiProvider } from '../../../context/EmojiContext';
import { ComponentProvider } from '../../../context/ComponentContext';
import { TranslationProvider } from '../../../context/TranslationContext';
import {
  emojiDataMock,
  generateChannel,
  generateMessage,
  generateReaction,
  generateUser,
  getTestClientWithUser,
} from '../../../mock-builders';

jest.mock('../MessageOptions', () => ({
  MessageOptions: jest.fn(() => <div />),
}));

const alice = generateUser({ name: 'alice' });
const bob = generateUser({ name: 'bob' });
const onMentionsHoverMock = jest.fn();
const onMentionsClickMock = jest.fn();
const defaultProps = {
  initialMessage: false,
  message: generateMessage(),
  messageWrapperRef: { current: document.createElement('div') },
  onReactionListClick: () => {},
  threadList: false,
};

function generateAliceMessage(messageOptions) {
  return generateMessage({
    user: alice,
    ...messageOptions,
  });
}

async function renderMessageText(customProps, channelConfigOverrides = {}, renderer = render) {
  const client = await getTestClientWithUser(alice);
  const channel = generateChannel({
    getConfig: () => ({ reactions: true, ...channelConfigOverrides }),
    state: { membership: {} },
  });
  const channelCapabilities = { 'send-reaction': true };
  const channelConfig = channel.getConfig();
  const customDateTimeParser = jest.fn(() => ({ format: jest.fn() }));

  return renderer(
    <ChatProvider value={{ client }}>
      <ChannelStateProvider value={{ channel, channelCapabilities, channelConfig }}>
        <ChannelActionProvider
          value={{ onMentionsClick: onMentionsClickMock, onMentionsHover: onMentionsHoverMock }}
        >
          <TranslationProvider
            value={{
              t: (key) => key,
              tDateTimeParser: customDateTimeParser,
              userLanguage: 'en',
            }}
          >
            <ComponentProvider
              value={{
                Attachment,
                Emoji: EmojiComponentMock,
                // eslint-disable-next-line react/display-name
                Message: () => <MessageSimple channelConfig={channelConfig} />,
              }}
            >
              <EmojiProvider value={{ emojiConfig: emojiDataMock }}>
                <Message {...defaultProps} {...customProps}>
                  <MessageText {...defaultProps} {...customProps} />
                </Message>
              </EmojiProvider>
            </ComponentProvider>
          </TranslationProvider>
        </ChannelActionProvider>
      </ChannelStateProvider>
    </ChatProvider>,
  );
}

const messageTextTestId = 'message-text-inner-wrapper';
const reactionSelectorTestId = 'reaction-selector';

describe('<MessageText />', () => {
  beforeEach(jest.clearAllMocks);
  it('should not render anything if message is not set', async () => {
    const { queryByTestId } = await renderMessageText({ message: {} });
    expect(queryByTestId(messageTextTestId)).not.toBeInTheDocument();
  });

  it('should not render anything if message text is not set', async () => {
    const { queryByTestId } = await renderMessageText({ message: {} });
    expect(queryByTestId(messageTextTestId)).not.toBeInTheDocument();
  });

  it('should set attachments css class modifier when message has text and is focused', async () => {
    const attachment = {
      image_url: 'image.jpg',
      type: 'image',
    };
    const message = generateAliceMessage({
      attachments: [attachment, attachment, attachment],
    });
    const { getByTestId } = await renderMessageText({ message });
    expect(getByTestId(messageTextTestId).className).toContain('--has-attachment');
  });

  it('should set emoji css class when message has text that is only emojis', async () => {
    const message = generateAliceMessage({ text: '🤖🤖🤖🤖' });
    const { getByTestId } = await renderMessageText({ message });
    expect(getByTestId(messageTextTestId).className).toContain('--is-emoji');
  });

  it('should handle message mention mouse hover event', async () => {
    const message = generateAliceMessage({ mentioned_users: [bob] });
    const { getByTestId } = await renderMessageText({
      message,
      onMentionsHoverMessage: onMentionsHoverMock,
    });
    expect(onMentionsHoverMock).not.toHaveBeenCalled();
    fireEvent.mouseOver(getByTestId(messageTextTestId));
    expect(onMentionsHoverMock).toHaveBeenCalledTimes(1);
  });

  it('should handle message mention mouse click event', async () => {
    const message = generateAliceMessage({ mentioned_users: [bob] });
    const { getByTestId } = await renderMessageText({
      message,
      onMentionsClickMessage: onMentionsClickMock,
    });
    expect(onMentionsClickMock).not.toHaveBeenCalled();
    fireEvent.click(getByTestId(messageTextTestId));
    expect(onMentionsClickMock).toHaveBeenCalledTimes(1);
  });

  it('should inform that message was not sent when message is has type "error"', async () => {
    const message = generateAliceMessage({ type: 'error' });
    const { getByText } = await renderMessageText({ message });
    expect(getByText('Error · Unsent')).toBeInTheDocument();
  });

  it('should inform that retry is possible when message has status "failed"', async () => {
    const message = generateAliceMessage({ status: 'failed' });
    const { getByText } = await renderMessageText({ message });
    expect(getByText('Message Failed · Click to try again')).toBeInTheDocument();
  });

  it('render message html when unsafe html property is enabled', async () => {
    const message = generateAliceMessage({
      html: '<span data-testid="custom-html" />',
    });
    const { getByTestId } = await renderMessageText({
      message,
      unsafeHTML: true,
    });
    expect(getByTestId('custom-html')).toBeInTheDocument();
  });

  it('render message text', async () => {
    const text = 'Hello, world!';
    const message = generateAliceMessage({ text });
    const { getByText } = await renderMessageText({ message });
    expect(getByText(text)).toBeInTheDocument();
  });

  it('should display text in users set language', async () => {
    const text = 'bonjour';
    const message = generateAliceMessage({
      i18n: { en_text: 'hello', fr_text: 'bonjour', language: 'fr' },
      text,
    });

    const { getByText } = await renderMessageText({ message });

    expect(getByText('hello')).toBeInTheDocument();
  });

  it('should show reaction list if message has reactions and detailed reactions are not displayed', async () => {
    const bobReaction = generateReaction({ user: bob });
    const message = generateAliceMessage({
      latest_reactions: [bobReaction],
    });
    const { getByTestId } = await renderMessageText({ message });
    expect(getByTestId('reaction-list')).toBeInTheDocument();
  });

  it('should not show reaction list if disabled in channelConfig', async () => {
    const bobReaction = generateReaction({ user: bob });
    const message = generateAliceMessage({
      latest_reactions: [bobReaction],
    });
    const { queryByTestId } = await renderMessageText({ message }, { reactions: false });

    expect(queryByTestId('reaction-list')).not.toBeInTheDocument();
  });

  it('should show reaction selector when message has reaction and reaction list is clicked', async () => {
    const bobReaction = generateReaction({ user: bob });
    const message = generateAliceMessage({
      latest_reactions: [bobReaction],
    });
    const { getByTestId, queryByTestId } = await renderMessageText({ message });
    expect(queryByTestId(reactionSelectorTestId)).not.toBeInTheDocument();
    fireEvent.click(getByTestId('reaction-list'));
    expect(getByTestId(reactionSelectorTestId)).toBeInTheDocument();
  });

  it('should render message options', async () => {
    await renderMessageText();
    expect(MessageOptionsMock).toHaveBeenCalledTimes(1);
  });

  it('should render message options with custom props when those are set', async () => {
    const displayLeft = false;
    await renderMessageText({
      customOptionProps: {
        displayLeft,
      },
    });
    // eslint-disable-next-line jest/prefer-called-with
    expect(MessageOptionsMock).toHaveBeenCalled();
  });

  it('should render with a custom wrapper class when one is set', async () => {
    const customWrapperClass = 'custom-wrapper';
    const message = generateMessage({ text: 'hello world' });
    const tree = await renderMessageText({ customWrapperClass, message }, {}, testRenderer.create);
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="str-chat__message str-chat__message-simple
      						str-chat__message--regular
      						str-chat__message--received
      						str-chat__message--has-text"
      >
        <div
          className="str-chat__message-inner"
          data-testid="message-inner"
        >
          <div />
          <div
            className="str-chat__message-text"
          >
            <div
              className="str-chat__message-text-inner str-chat__message-simple-text-inner"
              data-testid="message-text-inner-wrapper"
              onClick={[Function]}
              onMouseOver={[Function]}
            >
              <div
                onClick={[Function]}
              >
                <p>
                  hello world
                </p>
              </div>
            </div>
          </div>
          <div
            className="str-chat__message-data str-chat__message-simple-data"
          />
        </div>
      </div>
    `);
  });

  it('should render with a custom inner class when one is set', async () => {
    const customInnerClass = 'custom-inner';
    const message = generateMessage({ text: 'hi mate' });
    const tree = await renderMessageText({ customInnerClass, message }, {}, testRenderer.create);
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="str-chat__message str-chat__message-simple
      						str-chat__message--regular
      						str-chat__message--received
      						str-chat__message--has-text"
      >
        <div
          className="str-chat__message-inner"
          data-testid="message-inner"
        >
          <div />
          <div
            className="str-chat__message-text"
          >
            <div
              className="str-chat__message-text-inner str-chat__message-simple-text-inner"
              data-testid="message-text-inner-wrapper"
              onClick={[Function]}
              onMouseOver={[Function]}
            >
              <div
                onClick={[Function]}
              >
                <p>
                  hi mate
                </p>
              </div>
            </div>
          </div>
          <div
            className="str-chat__message-data str-chat__message-simple-data"
          />
        </div>
      </div>
    `);
  });

  it('should render with custom theme identifier in generated css classes when theme is set', async () => {
    const message = generateMessage({ text: 'whatup?!' });
    const tree = await renderMessageText({ message, theme: 'custom' }, {}, testRenderer.create);
    expect(tree.toJSON()).toMatchInlineSnapshot(`
      <div
        className="str-chat__message str-chat__message-simple
      						str-chat__message--regular
      						str-chat__message--received
      						str-chat__message--has-text"
      >
        <div
          className="str-chat__message-inner"
          data-testid="message-inner"
        >
          <div />
          <div
            className="str-chat__message-text"
          >
            <div
              className="str-chat__message-text-inner str-chat__message-simple-text-inner"
              data-testid="message-text-inner-wrapper"
              onClick={[Function]}
              onMouseOver={[Function]}
            >
              <div
                onClick={[Function]}
              >
                <p>
                  whatup?!
                </p>
              </div>
            </div>
          </div>
          <div
            className="str-chat__message-data str-chat__message-simple-data"
          />
        </div>
      </div>
    `);
  });
});
