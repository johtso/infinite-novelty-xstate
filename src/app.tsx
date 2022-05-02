import { useInterpret, useSelector } from '@xstate/react';
import clsx from 'clsx';
import { useEffect } from "react";
import { ActorRefFrom, StateFrom } from "xstate";
import { Gallery } from './gallery';
import './index.css';
import { flickrMachine } from "./machines/flickr.machine";
import mainMachine from "./machines/main.machine";

type FaveStates = { [key: string]: boolean };

const getFlickr = (state: StateFrom<typeof mainMachine>) => state.children.flickr as ActorRefFrom<typeof flickrMachine>

export function App() {
  const service = useInterpret(mainMachine);
  const flickr = getFlickr(service.getSnapshot());

  useEffect(() => {
    service.send({ type: "NEED_MORE_IMAGES", limit: 20 });

    import('commandbar').then((commandbar) => {
      commandbar.init('a38a2a14');
      window.CommandBar.boot('foo');

      window.CommandBar.addRouter(
        (url) => {
          service.send({ type: "CHANGE_URL", url: url }, { to: "#router" });
        }
      );

      window.CommandBar.addCallback("startFlickrAuth", () => {
        service.send({ type: "START_FLICKR_AUTH" });
      });
    });
  }, []);

  const images = useSelector(service, (state) => {
    return state.context.images;
  });

  const faveStates = useSelector(
    flickr,
    (state): FaveStates => {
      const faveStates = state.context.faveStates;
      const imageIds = images.map((image) => image.id);
      const filteredFaveStates: FaveStates = {};
      Object.keys(faveStates).forEach((key) => {
        if (imageIds.includes(key)) {
          filteredFaveStates[key] = faveStates[key];
        }
      });
      return filteredFaveStates;
    },
    (a, b) => {
      return JSON.stringify(a) === JSON.stringify(b)
    }
  );

  const isAuthed = useSelector(service, (state) => {
    return state.children.flickr.getSnapshot().matches("authorised");
  });

  useEffect(() => {
    if (window.CommandBar) {
      window.CommandBar.setContext({ flickrAuthState: isAuthed });
    }
  }, [isAuthed, window.CommandBar]);

  const imagesWithFaves = images.map((image) => {
    return {
      ...image,
      isFaved: faveStates[image.id]
    }
  });

  if (!imagesWithFaves.length) {
    return (
      <div className="loadingspinner" id="loading"></div>
    )
  } else {
    return (
      <div className={clsx("container", isAuthed && "flickr-authed")}>
        <Gallery
          images={imagesWithFaves}
          loadMore={
            (startIndex: number, stopIndex: number) => {
              service.send({ type: "REQUEST_IMAGE_RANGE", startIndex, stopIndex })
            }
          }
          toggleFave={
            (imageId: string) => {
              console.log("toggleFave", imageId);

              getFlickr(service.getSnapshot()).send({ type: "TOGGLE_FAVE_IMAGE", imageId: imageId });
            }
          }
        />
      </div>
    )
  }
}
