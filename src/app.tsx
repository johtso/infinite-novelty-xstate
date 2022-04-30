// import { inspect } from "@xstate/inspect";
import { useInterpret, useSelector } from '@xstate/react';
import clsx from 'clsx';
import { useEffect } from "react";
import { Gallery } from './gallery';
import './index.css';
import mainMachine from "./machines/main.machine";


export function App() {
  const service = useInterpret(mainMachine);

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

  const isAuthed = useSelector(service, (state) => {
    return state.children.flickr.getSnapshot().matches("authorised");
  });

  if (!images.length) {
    return (
      <div class="loadingspinner" id="loading"></div>
    )
  } else {
    return (
      <div className={clsx("container", isAuthed && "flickr-authed")}>
        <Gallery
          images={images}
          loadMore={
            (count: number) => {
              service.send({ type: "NEED_MORE_IMAGES", limit: count })
            }
          }
          toggleFave={
            (imageId: string) => {
              service.send({ type: "TOGGLE_FAVE_IMAGE", imageId: imageId });
            }
          }
        />
      </div>
    )
  }
}
