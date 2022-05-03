import { useInterpret, useSelector } from '@xstate/react';
import clsx from 'clsx';
import { useEffect } from "react";
import { ActorRefFrom, InterpreterFrom } from "xstate";
import { Gallery } from './gallery';
import './index.css';
import { flickrMachine } from './machines/flickr.machine';
import { makeImageStreamMachine } from "./machines/imagestream.machine";
import mainMachine from "./machines/main.machine";

type FaveStates = { [key: string]: boolean };

type MainMachine = ActorRefFrom<typeof mainMachine>;
type ImageStreamMachine = ActorRefFrom<ReturnType<typeof makeImageStreamMachine>>;
type FlickrMachine = ActorRefFrom<typeof flickrMachine>;

// const getFlickr = (state: StateFrom<typeof mainMachine>) => state.children.flickr as ActorRefFrom<typeof flickrMachine>

const useCommandBar = (service: InterpreterFrom<typeof mainMachine>) => {
  const flickr = useFlickrService(service);
  const isAuthed = useIsAuthed(service);

  useEffect(() => {
    import('commandbar').then((commandbar) => {

      commandbar.init('a38a2a14');
      window.CommandBar.boot('foo');

      window.CommandBar.addRouter(
        (url) => {
          service.send({ type: "CHANGE_URL", url: url }, { to: "#router" });
        }
      );

      window.CommandBar.addCallback("startFlickrAuth", () => {
        flickr.send({ type: "AUTHORISE" });
      });
    });
  }, []);

  useEffect(() => {
    if (window.CommandBar) {
      window.CommandBar.setContext({ flickrAuthState: isAuthed });
    }
  }, [isAuthed, window.CommandBar]);
}

const useFlickrService = (service: MainMachine): FlickrMachine => {
  return useSelector(service, (state): FlickrMachine => {
    return state.children.flickr as FlickrMachine;
  });
}

const useIsAuthed = (service: MainMachine) => {
  const flickr = useFlickrService(service);
  return useSelector(flickr, (state): boolean => {
    return state.matches("authorised")
  });
}

const useMainImageStream = (service: MainMachine): ImageStreamMachine => {
  return useSelector(service, (state) => {
    const service = state.children.mainImageStream;
    return service as ImageStreamMachine;
  });
}

const useBookImageStream = (service: MainMachine): ImageStreamMachine => {
  return useSelector(service, (state) => {
    const service = state.children.bookImageStream;
    return service as ImageStreamMachine;
  });
}

export function App() {
  const service = useInterpret(mainMachine, { actions: {} }, (state) => { });
  const flickr = useFlickrService(service);

  useCommandBar(service);

  const isAuthed = useIsAuthed(service);

  const mainImageStream = useMainImageStream(service);
  const bookImageStream = useBookImageStream(service);

  const viewingBook = useSelector(service, (state) => {
    return state.matches("active.viewingBook");
  });

  console.log({ mainImageStream, bookImageStream, viewingBook });

  if (!mainImageStream) {
    return <div className="loadingspinner"></div>;
  } else {
    return (
      <div className={clsx("container", isAuthed && "flickr-authed")}>
        <ImageStream
          hidden={viewingBook}
          service={mainImageStream}
          flickr={flickr}
        />
        {viewingBook &&
          <ImageStream
            service={bookImageStream}
            flickr={flickr}
          />
        }
      </div>

    )
  }
}

const ImageStream = ({ hidden, service, flickr }: { hidden?: boolean, service: ImageStreamMachine, flickr: FlickrMachine }) => {
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

  const imagesWithFaves = images.map((image) => {
    return {
      ...image,
      isFaved: faveStates[image.id]
    }
  });

  return (
    <div className={clsx(hidden && "hidden")}>
      <Gallery
        images={imagesWithFaves}
        loadMore={
          (startIndex: number, stopIndex: number) => {
            service.send({ type: "LOAD_MORE_IMAGES", startIndex, limit: (stopIndex - startIndex) });
          }
        }
        toggleFave={
          (imageId: string) => {
            flickr.send({ type: "TOGGLE_FAVE_IMAGE", imageId: imageId });
          }
        }
        paused={hidden}
      />
    </div>
  )
}