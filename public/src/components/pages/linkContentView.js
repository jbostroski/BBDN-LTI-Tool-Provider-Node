import JSONInput from 'react-json-editor-ajrm';
import React from 'react';
import Typography from '@material-ui/core/Typography';
import locale from 'react-json-editor-ajrm/locale/en';
import {Button, Grid, TextField} from '@material-ui/core';
import { styles } from '../../common/styles/custom.js';

class LinkContentView extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    fetch('lcsPayloadData')
      .then(result => result.json())
      .then(lcsPayload => {
        this.setState({
          origBody: lcsPayload.orig_body,
          claim: lcsPayload.claim,
          contentItems: lcsPayload.contentItems,
          contentItem: lcsPayload.contentItem,
          body: lcsPayload.body,
          scopeRead: lcsPayload.scopeRead,
          scopeUpdate: lcsPayload.scopeUpdate,
          scopeCreate: lcsPayload.scopeCreate,
          scopeDelete: lcsPayload.scopeDelete,
          types: lcsPayload.types
        });
      });
  }

  render() {
    if (!this.state.origBody) {
      return <Typography variant='h4'>Loading...</Typography>;
    }

    const body = JSON.stringify(this.state.origBody);

    const getItems =
      this.state.scopeRead ? (
        <form action='/lcsGetItems' method='post'>
          <Button type={'submit'} variant={'contained'} color={'secondary'}>Get Content Items</Button>
          <input type='hidden' name='body' defaultValue={body}/>
          <input type='hidden' name='url' defaultValue={this.state.contentItems}/>
        </form>
      ) : (
        <Typography variant='subtitle1' style={styles.notAvailable}>
          <b>Get Content Items not available</b>
        </Typography>
      );

    const createItem =
      this.state.scopeCreate ? (
        <form action='/lcsCreateItem' method='post'>
          <table>
            <tbody>
              <tr>
                <td>
                  <Button type={'submit'} variant={'contained'} color={'secondary'}>Create ltiResourceLink</Button>
                  <input type='hidden' name='body' defaultValue={body}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'title'}
                    label={'Title'}
                    size={'small'}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'resourceUrl'}
                    label={'Launch URL'}
                    size={'small'}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'text'}
                    label={'Description'}
                    size={'small'}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'custom'}
                    label={'Custom (key=val per line)'}
                    size={'small'}
                    multiline
                    rowsMin={2}/>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      ) : (
        <Typography variant='subtitle1' style={styles.notAvailable}>
          <b>Create Content Item not available</b>
        </Typography>
      );

    const updateItem =
      this.state.scopeUpdate ? (
        <form action='/lcsUpdateItem' method='post'>
          <table>
            <tbody>
              <tr>
                <td>
                  <Button type={'submit'} variant={'contained'} color={'secondary'}>Update ltiResourceLink</Button>
                  <input type='hidden' name='body' defaultValue={body}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'itemUrl'}
                    label={'Item URL'}
                    size={'small'}
                    defaultValue={this.state.contentItem}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'title'}
                    label={'Title'}
                    size={'small'}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'resourceUrl'}
                    label={'Launch URL'}
                    size={'small'}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'text'}
                    label={'Description'}
                    size={'small'}/>
                </td>
                <td>
                  <TextField
                    variant={'outlined'}
                    name={'custom'}
                    label={'Custom (key=val per line)'}
                    size={'small'}
                    multiline
                    rowsMin={2}/>
                </td>
              </tr>
            </tbody>
          </table>
        </form>
      ) : (
        <Typography variant='subtitle1' style={styles.notAvailable}>
          <b>Update Content Item not available</b>
        </Typography>
      );

    return (
      <div>
        <Typography variant='h4' gutterBottom>
          Link and Content Service
        </Typography>

        <div>
          <Typography variant='h6' gutterBottom>
            What would you like to do?
          </Typography>
          <Grid
            container
            direction={'column'}
            spacing={2}>
            <Grid item xs>
              {getItems}
            </Grid>
            <Grid item xs>
              {createItem}
            </Grid>
            <Grid item xs>
              {updateItem}
            </Grid>
          </Grid>

          <br/>
          <Typography variant='h5' gutterBottom>
            Link and Content Service Response
          </Typography>

          <Typography variant='h6' gutterBottom>
            <b>Claims</b>
          </Typography>
          <JSONInput
            id='claim'
            viewOnly={true}
            confirmGood={false}
            placeholder={this.state.claim}
            theme='dark_vscode_tribute'
            style={{ body: styles.jsonEditor }}
            locale={locale}
            height='100%'
            width='max-content'
          />

          <Typography variant='h6' gutterBottom>
            <b>Response</b>
          </Typography>
          <JSONInput
            id='lcs_body'
            viewOnly={true}
            confirmGood={true}
            placeholder={this.state.body}
            theme='dark_vscode_tribute'
            style={{ body: styles.jsonEditor }}
            locale={locale}
            height='100%'
            width='100%'
          />
        </div>
      </div>
    );
  }
}

export default LinkContentView;
