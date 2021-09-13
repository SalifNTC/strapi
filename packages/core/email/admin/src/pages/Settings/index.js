import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { get } from 'lodash';
import {
  getYupInnerErrors,
  CheckPagePermissions,
  useNotification,
  LoadingIndicatorPage,
  useOverlayBlocker,
  useFocusWhenNavigate,
} from '@strapi/helper-plugin';
import { Main } from '@strapi/parts/Main';
import { ContentLayout } from '@strapi/parts/Layout';
import { Stack } from '@strapi/parts/Stack';
import { Box } from '@strapi/parts/Box';
import { Grid, GridItem } from '@strapi/parts/Grid';
import { H3 } from '@strapi/parts/Text';
import { TextInput } from '@strapi/parts/TextInput';
import { Button } from '@strapi/parts/Button';
import { useNotifyAT } from '@strapi/parts/LiveRegions';
import CheckIcon from '@strapi/icons/CheckIcon';
import Configuration from './components/Configuration';
import schema from '../../utils/schema';
import pluginPermissions from '../../permissions';
import { fetchEmailSettings, postEmailTest } from './utils/api';
import EmailHeader from './components/EmailHeader';
import getTrad from '../../utils/getTrad';

const ProtectedSettingsPage = () => (
  <CheckPagePermissions permissions={pluginPermissions.settings}>
    <SettingsPage />
  </CheckPagePermissions>
);

const SettingsPage = () => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { lockApp, unlockApp } = useOverlayBlocker();
  const { notifyStatus } = useNotifyAT();
  useFocusWhenNavigate();

  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [config, setConfig] = useState({
    provider: '',
    settings: { defaultFrom: '', defaultReplyTo: '', testAddress: '' },
  });

  const handleChange = e => {
    setTestAddress(() => e.target.value);
  };

  const handleSubmit = async event => {
    event.preventDefault();

    try {
      await schema.validate({ email: testAddress }, { abortEarly: false });

      setIsSubmitting(true);
      lockApp();

      postEmailTest({ to: testAddress })
        .then(() => {
          toggleNotification({
            type: 'success',
            message: formatMessage(
              {
                id: getTrad('Settings.email.plugin.notification.test.success'),
                defaultMessage: 'Email test succeeded, check the {to} mailbox',
              },
              { to: testAddress }
            ),
          });
        })
        .catch(() => {
          toggleNotification({
            type: 'warning',
            message: formatMessage(
              {
                id: getTrad('Settings.email.plugin.notification.test.error'),
                defaultMessage: 'Failed to send a test mail to {to}',
              },
              { to: testAddress }
            ),
          });
        })
        .finally(() => {
          setIsSubmitting(false);
          unlockApp();
        });
    } catch (error) {
      setFormErrors(getYupInnerErrors(error));
    }
  };

  useEffect(() => {
    setIsLoading(true);

    fetchEmailSettings()
      .then(config => {
        notifyStatus(
          formatMessage({
            id: 'Settings.email.plugin.notification.data.loaded',
            defaultMessage: 'Email settings data has been loaded',
          })
        );

        setConfig(config);

        const testAddressFound = get(config, 'settings.testAddress');

        if (testAddressFound) {
          setTestAddress(testAddressFound);
        }
      })
      .catch(() =>
        toggleNotification({
          type: 'warning',
          message: formatMessage({
            id: getTrad('Settings.email.plugin.notification.config.error'),
            defaultMessage: 'Failed to retrieve the email config',
          }),
        })
      )
      .finally(() => setIsLoading(false));
  }, [formatMessage, toggleNotification, notifyStatus]);

  if (isLoading) {
    return (
      <Main labelledBy="title" aria-busy="true">
        <EmailHeader />
        <ContentLayout>
          <LoadingIndicatorPage />
        </ContentLayout>
      </Main>
    );
  }

  return (
    <Main labelledBy="title" aria-busy={isSubmitting}>
      <EmailHeader />
      <ContentLayout>
        <form onSubmit={handleSubmit}>
          <Stack size={7}>
            <Box
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Configuration config={config} />
            </Box>
            <Box
              background="neutral0"
              hasRadius
              shadow="filterShadow"
              paddingTop={6}
              paddingBottom={6}
              paddingLeft={7}
              paddingRight={7}
            >
              <Stack size={4}>
                <H3 as="h2">
                  {formatMessage({
                    id: getTrad('Settings.email.plugin.title.test'),
                    defaultMessage: 'Send a test mail',
                  })}
                </H3>
                <Grid gap={5} alignItems="end">
                  <GridItem col={6} s={12}>
                    <TextInput
                      name="test-address"
                      onChange={handleChange}
                      label={formatMessage({
                        id: getTrad('Settings.email.plugin.label.testAddress'),
                        defaultMessage: 'Test delivery email address',
                      })}
                      value={testAddress}
                      error={
                        formErrors.email?.id &&
                        formatMessage({
                          id: getTrad(`${formErrors.email?.id}`),
                          defaultMessage: 'An error occured',
                        })
                      }
                      placeholder={formatMessage({
                        id: 'Settings.email.plugin.placeholder.testAddress',
                        defaultMessage: 'ex: developer@example.com',
                      })}
                    />
                  </GridItem>
                  <GridItem col={7} s={12}>
                    {/* to replace with envelope icon */}
                    <Button loading={isSubmitting} type="submit" startIcon={<CheckIcon />}>
                      Test email
                    </Button>
                  </GridItem>
                </Grid>
              </Stack>
            </Box>
          </Stack>
        </form>
      </ContentLayout>
    </Main>
  );
};

export default ProtectedSettingsPage;
