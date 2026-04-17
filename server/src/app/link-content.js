import request from 'request';
import { getLTIToken } from './lti-token-service';
import { getAppById } from '../database/db-utility';

const readScope = 'https://purl.imsglobal.org/spec/lti/scope/contentitem.read';
const updateScope = 'https://purl.imsglobal.org/spec/lti/scope/contentitem.update';
const createScope = 'https://purl.imsglobal.org/spec/lti/scope/contentitem.create';
const deleteScope = 'https://purl.imsglobal.org/spec/lti/scope/contentitem.delete';

const safeJsonParse = (str, fallback) => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return fallback || { error: 'Unexpected response', raw: String(str).substring(0, 200) };
  }
};

// Get a fresh LCS token with the given scope and deployment_id
const getLCSToken = async (req, lcsPayload, scope) => {
  const parsed = safeJsonParse(req.body.body, null);
  if (!parsed || !parsed.aud) {
    throw new Error('Missing or invalid request body');
  }
  let client_id = parsed.aud;
  if (client_id instanceof Array) {
    client_id = client_id[0];
  }
  const tokenUrl = getAppById(client_id).setup.jwtUrl;
  return getLTIToken(client_id, tokenUrl, scope, null, lcsPayload.deploymentId);
};

export default function linkContent(req, res, lcsPayload) {
  let json = safeJsonParse(req.body.body, null);
  if (!json) {
    lcsPayload.body = { error: 'Invalid or missing launch body' };
    return;
  }
  lcsPayload.orig_body = json;
  lcsPayload.claim =
    json['https://purl.imsglobal.org/spec/lti/claim/linkcontentservice'];
  lcsPayload.deploymentId =
    json['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
  let scopes = lcsPayload.claim.scopes;
  scopes.forEach(function (element) {
    switch (element) {
    case readScope:
      lcsPayload.scopeRead = true;
      break;

    case updateScope:
      lcsPayload.scopeUpdate = true;
      break;

    case createScope:
      lcsPayload.scopeCreate = true;
      break;

    case deleteScope:
      lcsPayload.scopeDelete = true;
      break;
    }
  });
  lcsPayload.contentItems = lcsPayload.claim.contentitems;
  lcsPayload.contentItem = lcsPayload.claim.contentitem;
  lcsPayload.types = lcsPayload.claim.types;
}

export const getContentItems = (req, res, lcsPayload) => {
  getLCSToken(req, lcsPayload, readScope).then(
    function (token) {
      let options = {
        method: 'GET',
        uri: lcsPayload.url,
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + token
        }
      };

      request(options, function (err, response, body) {
        let json = safeJsonParse(body);

        if (err) {
          console.log('LCS Get Content Items Error - request failed: ' + err.message);
          lcsPayload.body = { error: err.message };
        } else if (response.statusCode !== 200) {
          lcsPayload.body = json;
        } else {
          lcsPayload.body = json;
        }
        res.redirect('/link_content_view');
      });
    },
    function (error) {
      console.log('LCS Get Content Items - token error: ' + error);
      lcsPayload.body = { error: error && error.message ? error.message : 'Failed to get LCS token' };
      res.redirect('/link_content_view');
    }
  );
};

export const createContentItem = (req, res, lcsPayload) => {
  getLCSToken(req, lcsPayload, createScope).then(
    function (token) {
      let newItem = {
        type: 'ltiResourceLink',
        title: lcsPayload.form.title,
        url: lcsPayload.form.resourceUrl,
        text: lcsPayload.form.text || undefined,
        custom: {}
      };

      // Parse custom parameters if provided (key=value, one per line)
      if (lcsPayload.form.custom) {
        let lines = lcsPayload.form.custom.split('\n');
        lines.forEach(function (line) {
          let parts = line.split('=');
          if (parts.length === 2) {
            newItem.custom[parts[0].trim()] = parts[1].trim();
          }
        });
      }

      if (Object.keys(newItem.custom).length === 0) {
        delete newItem.custom;
      }

      let options = {
        method: 'POST',
        uri: lcsPayload.contentItems,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify(newItem)
      };

      request(options, function (err, response, body) {
        let json = body ? safeJsonParse(body) : {};

        if (err) {
          console.log('LCS Create Content Item Error - request failed: ' + err.message);
          lcsPayload.body = { error: err.message };
        } else if (response.statusCode !== 200 && response.statusCode !== 201) {
          lcsPayload.body = json;
        } else {
          lcsPayload.body = json;
        }
        res.redirect('/link_content_view');
      });
    },
    function (error) {
      console.log('LCS Create Content Item - token error: ' + error);
      lcsPayload.body = { error: error && error.message ? error.message : 'Failed to get LCS token' };
      res.redirect('/link_content_view');
    }
  );
};

export const updateContentItem = (req, res, lcsPayload) => {
  getLCSToken(req, lcsPayload, readScope + ' ' + updateScope).then(
    function (token) {
      let itemUrl = lcsPayload.form.itemUrl;

      // First GET the existing item so we can do a full replace
      let getOptions = {
        method: 'GET',
        uri: itemUrl,
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + token
        }
      };

      request(getOptions, function (err, response, body) {
        if (err || response.statusCode !== 200) {
          let json = body ? safeJsonParse(body, { error: 'Failed to GET item for update' }) : { error: 'Failed to GET item for update' };
          lcsPayload.body = json;
          res.redirect('/link_content_view');
          return;
        }

        let existingItem = safeJsonParse(body);

        // Apply updates on top of existing item (PUT is full replace)
        let updatedItem = Object.assign({}, existingItem);
        if (lcsPayload.form.title) {
          updatedItem.title = lcsPayload.form.title;
        }
        if (lcsPayload.form.resourceUrl) {
          updatedItem.url = lcsPayload.form.resourceUrl;
        }
        if (lcsPayload.form.text !== undefined) {
          updatedItem.text = lcsPayload.form.text;
        }

        // Parse custom parameters if provided
        if (lcsPayload.form.custom) {
          updatedItem.custom = {};
          let lines = lcsPayload.form.custom.split('\n');
          lines.forEach(function (line) {
            let parts = line.split('=');
            if (parts.length === 2) {
              updatedItem.custom[parts[0].trim()] = parts[1].trim();
            }
          });
        }

        // Remove read-only fields that the server will ignore anyway
        delete updatedItem.id;
        delete updatedItem.resourceLinkId;
        delete updatedItem.lineItemIds;
        delete updatedItem.readonly;

        let putOptions = {
          method: 'PUT',
          uri: itemUrl,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + token
          },
          body: JSON.stringify(updatedItem)
        };

        request(putOptions, function (putErr, putResponse, putBody) {
          let json = putBody ? safeJsonParse(putBody) : {};

          if (putErr) {
            console.log('LCS Update Content Item Error - request failed: ' + putErr.message);
            lcsPayload.body = { error: putErr.message };
          } else if (putResponse.statusCode !== 200) {
            lcsPayload.body = json;
          } else {
            lcsPayload.body = json;
          }
          res.redirect('/link_content_view');
        });
      });
    },
    function (error) {
      console.log('LCS Update Content Item - token error: ' + error);
      lcsPayload.body = { error: error && error.message ? error.message : 'Failed to get LCS token' };
      res.redirect('/link_content_view');
    }
  );
};
