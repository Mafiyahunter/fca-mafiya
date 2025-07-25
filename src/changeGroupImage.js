"use strict";

const utils = require("../utils");
// @Mafiyahunter

module.exports = function (defaultFuncs, api, ctx) {
  function handleUpload(image, callback) {
    const uploads = [];

    const form = {
      images_only: "true",
      "attachment[]": image,
    };

    uploads.push(
      defaultFuncs
        .postFormData(
          "https://upload.facebook.com/ajax/mercury/upload.php",
          ctx.jar,
          form,
          {},
        )
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
        .then(function (resData) {
          if (resData.error) {
            throw resData;
          }

          return resData.payload.metadata[0];
        }),
    );

    // resolve all promises
    Promise.all(uploads)
      .then(function (resData) {
        callback(null, resData);
      })
      .catch(function (err) {
        utils.error("handleUpload", err);
        return callback(err);
      });
  }

  return function changeGroupImage(image, threadID, callback) {
    if (
      !callback &&
      (utils.getType(threadID) === "Function" ||
        utils.getType(threadID) === "AsyncFunction")
    ) {
      throw { error: "please pass a threadID as a second argument." };
    }

    if (!utils.isReadableStream(image)) {
      throw { error: "please pass a readable stream as a first argument." };
    }

    let resolveFunc = function () {};
    let rejectFunc = function () {};
    const returnPromise = new Promise(function (resolve, reject) {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err) {
        if (err) {
          return rejectFunc(err);
        }
        resolveFunc();
      };
    }

    const messageAndOTID = utils.generateOfflineThreadingID();
    const form = {
      client: "mercury",
      action_type: "ma-type:log-message",
      author: "fbid:" + (ctx.userID),
      author_email: "",
      ephemeral_ttl_mode: "0",
      is_filtered_content: false,
      is_filtered_content_account: false,
      is_filtered_content_bh: false,
      is_filtered_content_invalid_app: false,
      is_filtered_content_quasar: false,
      is_forward: false,
      is_spoof_warning: false,
      is_unread: false,
      log_message_type: "log:thread-image",
      manual_retry_cnt: "0",
      message_id: messageAndOTID,
      offline_threading_id: messageAndOTID,
      source: "source:chat:web",
      "source_tags[0]": "source:chat",
      status: "0",
      thread_fbid: threadID,
      thread_id: "",
      timestamp: Date.now(),
      timestamp_absolute: "Today",
      timestamp_relative: utils.generateTimestampRelative(),
      timestamp_time_passed: "0",
    };

    handleUpload(image, function (err, payload) {
      if (err) {
        return callback(err);
      }

      form["thread_image_id"] = payload[0]["image_id"];
      form["thread_id"] = threadID;

      defaultFuncs
        .post(
          "https://www.facebook.com/messaging/set_thread_image/",
          ctx.jar,
          form,
        )
        .then(utils.parseAndCheckLogin(ctx, defaultFuncs))
        .then(function (resData) {
          // check for errors here

          if (resData.error) {
            throw resData;
          }

          return callback();
        })
        .catch(function (err) {
          utils.error("changeGroupImage", err);
          return callback(err);
        });
    });

    return returnPromise;
  };
};
